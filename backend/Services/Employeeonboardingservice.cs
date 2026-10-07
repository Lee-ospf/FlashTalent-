using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public enum OnboardingOutcome
    {
        Created,
        AlreadyOnboarded,
        ApplicationNotFound,
        NotHired,
        InvalidDetails,
        Conflict
    }

    public class OnboardingResult
    {
        public OnboardingOutcome Outcome { get; init; }
        public string Message { get; init; } = string.Empty;
        public OnboardingCompleteResponse? Data { get; init; }
    }

    public interface IEmployeeOnboardingService
    {
        Task<OnboardingResult> CompleteAsync(OnboardingCompleteRequest request);
    }

    // The ONE place an Employee is created. Today it is called by the recruiter's
    // "mark as onboarded" action; when the onboarding system is integrated, the same
    // service is called by its webhook. Nothing in here changes when that happens.
    public class EmployeeOnboardingService : IEmployeeOnboardingService
    {
        private readonly AppDbContext _db;
        private readonly IEmployeeProfileCopyService _copyService;

        public EmployeeOnboardingService(AppDbContext db, IEmployeeProfileCopyService copyService)
        {
            _db = db;
            _copyService = copyService;
        }

        public async Task<OnboardingResult> CompleteAsync(OnboardingCompleteRequest request)
        {
            var workEmail = request.WorkEmail.Trim();
            var externalEmployeeId = request.ExternalEmployeeId.Trim();

            // 1. The application must exist and be Hired
            var application = await _db.Applications
                .Include(a => a.Candidate).ThenInclude(c => c!.User)
                .Include(a => a.Vacancy)
                .FirstOrDefaultAsync(a => a.ApplicationId == request.SourceApplicationId);

            if (application == null)
                return Fail(OnboardingOutcome.ApplicationNotFound,
                    $"No application found with ApplicationId {request.SourceApplicationId}.");

            if (application.Status != ApplicationStatus.Hired)
                return Fail(OnboardingOutcome.NotHired,
                    $"Application is '{application.Status}'. Only Hired applications can be onboarded.");

            var user = application.Candidate?.User;
            if (user == null)
                return Fail(OnboardingOutcome.ApplicationNotFound,
                    "The candidate's user account could not be found for this application.");

            // 2. Resolve details: what the request says wins; otherwise default from the vacancy.
            //    (Vacancy.DepartmentId is only set for Internal vacancies.)
            var vacancy = application.Vacancy;

            var jobTitle = !string.IsNullOrWhiteSpace(request.JobTitle)
                ? request.JobTitle.Trim()
                : vacancy?.Title;

            var departmentId = request.DepartmentId ?? vacancy?.DepartmentId;

            var employmentType = !string.IsNullOrWhiteSpace(request.EmploymentType)
                ? request.EmploymentType.Trim()
                : vacancy?.EmploymentType.ToString();

            // 3. Idempotency: an Employee may already exist for this application
            var existing = await _db.Employees
                .FirstOrDefaultAsync(e => e.SourceApplicationId == application.ApplicationId);

            if (existing != null)
            {
                var sameDetails =
                    string.Equals(existing.ExternalEmployeeId, externalEmployeeId, StringComparison.OrdinalIgnoreCase)
                    && string.Equals(user.Email, workEmail, StringComparison.OrdinalIgnoreCase)
                    && existing.HireDate?.Date == request.HireDate.Date
                    && existing.JobTitle == jobTitle
                    && existing.DepartmentId == departmentId;

                if (!sameDetails)
                    return Fail(OnboardingOutcome.Conflict,
                        "An employee record already exists for this application with different details.");

                return new OnboardingResult
                {
                    Outcome = OnboardingOutcome.AlreadyOnboarded,
                    Message = "This application was already onboarded. Returning the existing record.",
                    Data = BuildResponse(existing, user, alreadyOnboarded: true, copied: null,
                        "This application was already onboarded.")
                };
            }

            // 4. Department is required and must exist
            if (departmentId == null)
                return Fail(OnboardingOutcome.InvalidDetails,
                    "A department is required. This vacancy has no department (client placements don't), so please supply departmentId.");

            if (!await _db.Departments.AnyAsync(d => d.DepartmentId == departmentId.Value))
                return Fail(OnboardingOutcome.InvalidDetails,
                    $"No department found with DepartmentId {departmentId}.");

            if (string.IsNullOrWhiteSpace(jobTitle))
                return Fail(OnboardingOutcome.InvalidDetails, "A job title is required.");

            // 5. Uniqueness checks (the database indexes are the final safety net)
            if (await _db.Employees.AnyAsync(e => e.ExternalEmployeeId == externalEmployeeId))
                return Fail(OnboardingOutcome.Conflict,
                    $"ExternalEmployeeId '{externalEmployeeId}' is already assigned to another employee.");

            if (await _db.Employees.AnyAsync(e => e.UserId == user.UserId))
                return Fail(OnboardingOutcome.Conflict,
                    "This person already has an employee record.");

            var emailChanges = !string.Equals(user.Email, workEmail, StringComparison.OrdinalIgnoreCase);
            if (emailChanges && await _db.Users.AnyAsync(u => u.Email == workEmail && u.UserId != user.UserId))
                return Fail(OnboardingOutcome.Conflict,
                    "The work email is already used by another account.");

            // 6. Create everything in ONE transaction
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                // Login email becomes the work email; the old one is kept as the personal email
                if (emailChanges)
                {
                    user.PersonalEmail = user.Email;
                    user.Email = workEmail;
                }

                user.Role = UserRole.Employee;
                user.MustChangePassword = true;
                user.UpdatedAt = DateTime.UtcNow;

                var employee = new Employee
                {
                    UserId = user.UserId,
                    SourceApplicationId = application.ApplicationId,
                    ExternalEmployeeId = externalEmployeeId,
                    DepartmentId = departmentId.Value,
                    EmployeeNumber = request.EmployeeNumber?.Trim(),
                    EmploymentType = employmentType,
                    JobTitle = jobTitle,
                    HireDate = request.HireDate,
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow
                };

                _db.Employees.Add(employee);

                var copied = await _copyService.CopyFromCandidateAsync(employee, application.CandidateId);

                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                return new OnboardingResult
                {
                    Outcome = OnboardingOutcome.Created,
                    Message = "Employee created.",
                    Data = BuildResponse(employee, user, alreadyOnboarded: false, copied,
                        "Employee created. The person now signs in with the work email.")
                };
            }
            catch (DbUpdateException)
            {
                
                return Fail(OnboardingOutcome.Conflict,
                    "The employee could not be saved, possibly because a duplicate request ran at the same moment. Please retry.");
            }
        }

        private static OnboardingCompleteResponse BuildResponse(
            Employee employee, User user, bool alreadyOnboarded, ProfileCopyResult? copied, string message)
        {
            return new OnboardingCompleteResponse
            {
                EmployeeId = employee.EmployeeId,
                UserId = user.UserId,
                LoginEmail = user.Email,
                PersonalEmail = user.PersonalEmail,
                Role = user.Role.ToString(),
                MustChangePassword = user.MustChangePassword,
                AlreadyOnboarded = alreadyOnboarded,
                Message = message,
                ProfileCopied = copied
            };
        }

        private static OnboardingResult Fail(OnboardingOutcome outcome, string message)
        {
            return new OnboardingResult { Outcome = outcome, Message = message };
        }
    }
}