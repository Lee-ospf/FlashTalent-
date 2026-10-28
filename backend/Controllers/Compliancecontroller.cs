using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;
using TalentHub.Services;

namespace TalentHub.Controllers
{
    // Read-only HR views of certification expiry and training compliance.
    // Only active employees are listed. The awaiting-confirmation list already exists at
    // GET api/training-assignments/awaiting-confirmation (TrainingAssignmentsController).
    // Status and days left come from CertificationReminderRules, the same rules the daily job uses.
    [ApiController]
    [Route("api/compliance")]
    [Authorize(Roles = "HR,Admin")]
    public class ComplianceController : TalentHubControllerBase
    {
        public ComplianceController(AppDbContext db) : base(db)
        {
        }

        // ================= Dashboard counts =================

        // GET api/compliance/summary
        [HttpGet("summary")]
        public async Task<ActionResult<ComplianceSummaryResponse>> GetSummary()
        {
            var today = BusinessClock.Today;
            var certs = ActiveCertifications();

            var summary = new ComplianceSummaryResponse
            {
                ExpiringIn90Days = await InStatus(certs, CertificationExpiryStatus.ExpiringIn90, today).CountAsync(),
                ExpiringIn30Days = await InStatus(certs, CertificationExpiryStatus.ExpiringIn30, today).CountAsync(),
                ExpiringIn7Days = await InStatus(certs, CertificationExpiryStatus.ExpiringIn7, today).CountAsync(),
                Expired = await InStatus(certs, CertificationExpiryStatus.Expired, today).CountAsync(),
                CertificatesWithNoExpiryDate = await certs.CountAsync(q => q.ExpiryDate == null),
                OverdueTraining = await OverdueAssignments(today).CountAsync(),
                AwaitingConfirmation = await Db.TrainingAssignments
                    .CountAsync(a => a.Status == TrainingAssignmentStatus.AwaitingConfirmation)
            };

            return Ok(summary);
        }

        // ================= Certifications =================

        // GET api/compliance/certifications/expiring?status=ExpiringIn30&search=aws
        // Everything expiring within 90 days plus everything already expired, most urgent first
        // (earliest expiry date at the top). status can be ExpiringIn90, ExpiringIn30, ExpiringIn7 or Expired.
        [HttpGet("certifications/expiring")]
        public async Task<ActionResult<List<CertificationExpiryItem>>> GetExpiringCertifications(
            [FromQuery] CertificationExpiryStatus? status, [FromQuery] string? search)
        {
            if (status == CertificationExpiryStatus.NoExpiryDate || status == CertificationExpiryStatus.Valid)
                return BadRequest(new
                {
                    message = "status must be ExpiringIn90, ExpiringIn30, ExpiringIn7 or Expired. " +
                              "Certificates without an expiry date are at api/compliance/certifications/no-expiry-date."
                });

            var today = BusinessClock.Today;
            var query = ActiveCertifications().Where(q => q.ExpiryDate != null);

            if (status.HasValue)
            {
                query = InStatus(query, status.Value, today);
            }
            else
            {
                var to = today.AddDays(91); // exclusive, so day 90 is included
                query = query.Where(q => q.ExpiryDate < to);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(q =>
                    q.Name.Contains(s) ||
                    q.Employee!.User!.FirstName.Contains(s) ||
                    q.Employee.User.LastName.Contains(s));
            }

            var rows = await query
                .OrderBy(q => q.ExpiryDate)
                .Select(q => new
                {
                    q.EmployeeQualificationId,
                    q.EmployeeId,
                    FirstName = q.Employee!.User!.FirstName,
                    LastName = q.Employee.User.LastName,
                    q.Employee.JobTitle,
                    DepartmentName = q.Employee.Department != null ? q.Employee.Department.Name : null,
                    q.Name,
                    q.Institution,
                    ExpiryDate = q.ExpiryDate!.Value
                })
                .ToListAsync();

            var items = rows.Select(r =>
            {
                var daysLeft = CertificationReminderRules.DaysLeft(r.ExpiryDate, today);
                return new CertificationExpiryItem
                {
                    EmployeeQualificationId = r.EmployeeQualificationId,
                    EmployeeId = r.EmployeeId,
                    EmployeeName = r.FirstName + " " + r.LastName,
                    JobTitle = r.JobTitle,
                    DepartmentName = r.DepartmentName,
                    CertificationName = r.Name,
                    Institution = r.Institution,
                    ExpiryDate = r.ExpiryDate,
                    DaysLeft = daysLeft,
                    Status = CertificationReminderRules.GetStatus(r.ExpiryDate, today),
                    IsPastAlertWindow = daysLeft < -CertificationReminderRules.ExpiredAlertWindowDays
                };
            }).ToList();

            return Ok(items);
        }

        // GET api/compliance/certifications/no-expiry-date?search=aws
        // Certifications where nobody has entered an expiry date yet, so no alerts can be sent for them.
        [HttpGet("certifications/no-expiry-date")]
        public async Task<ActionResult<List<CertificationNoExpiryItem>>> GetCertificationsWithoutExpiry(
            [FromQuery] string? search)
        {
            var query = ActiveCertifications().Where(q => q.ExpiryDate == null);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(q =>
                    q.Name.Contains(s) ||
                    q.Employee!.User!.FirstName.Contains(s) ||
                    q.Employee.User.LastName.Contains(s));
            }

            var items = await query
                .OrderBy(q => q.Employee!.User!.FirstName)
                .ThenBy(q => q.Employee!.User!.LastName)
                .ThenBy(q => q.Name)
                .Select(q => new CertificationNoExpiryItem
                {
                    EmployeeQualificationId = q.EmployeeQualificationId,
                    EmployeeId = q.EmployeeId,
                    EmployeeName = q.Employee!.User!.FirstName + " " + q.Employee.User.LastName,
                    JobTitle = q.Employee.JobTitle,
                    DepartmentName = q.Employee.Department != null ? q.Employee.Department.Name : null,
                    CertificationName = q.Name,
                    Institution = q.Institution,
                    ObtainedOn = q.YearCompleted
                })
                .ToListAsync();

            return Ok(items);
        }

        // ================= Training =================

        // GET api/compliance/training/overdue?programmeId=1&intakeId=2&search=sam
        // Not started or In progress and past the due date. Most overdue first.
        // A submission waiting for HR is not overdue: it is in the awaiting-confirmation queue.
        [HttpGet("training/overdue")]
        public async Task<ActionResult<List<OverdueTrainingItem>>> GetOverdueTraining(
            [FromQuery] int? programmeId, [FromQuery] int? intakeId, [FromQuery] string? search)
        {
            var today = BusinessClock.Today;
            var query = OverdueAssignments(today);

            if (programmeId.HasValue)
                query = query.Where(a => a.Intake!.TrainingProgrammeId == programmeId.Value);

            if (intakeId.HasValue)
                query = query.Where(a => a.TrainingIntakeId == intakeId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(a =>
                    a.Employee!.User!.FirstName.Contains(s) ||
                    a.Employee.User.LastName.Contains(s) ||
                    a.Intake!.Programme!.Title.Contains(s));
            }

            var items = await query
                .OrderBy(a => a.DueDate)
                .ThenBy(a => a.Employee!.User!.FirstName)
                .Select(a => new OverdueTrainingItem
                {
                    TrainingAssignmentId = a.TrainingAssignmentId,
                    EmployeeId = a.EmployeeId,
                    EmployeeName = a.Employee!.User!.FirstName + " " + a.Employee.User.LastName,
                    JobTitle = a.Employee.JobTitle,
                    DepartmentName = a.Employee.Department != null ? a.Employee.Department.Name : null,
                    TrainingProgrammeId = a.Intake!.TrainingProgrammeId,
                    ProgrammeTitle = a.Intake.Programme!.Title,
                    TrainingIntakeId = a.TrainingIntakeId,
                    IntakeName = a.Intake.Name,
                    Status = a.Status,
                    ProgressPercent = a.ProgressPercent,
                    DueDate = a.DueDate
                })
                .ToListAsync();

            foreach (var item in items)
                item.DaysOverdue = Math.Max(0, (today - item.DueDate.Date).Days);

            return Ok(items);
        }

        // ================= Helpers =================

        private IQueryable<EmployeeQualification> ActiveCertifications()
            => Db.EmployeeQualifications
                .AsNoTracking()
                .Where(q => q.QualificationType == QualificationType.Certification
                    && q.Employee!.Status == "Active"
                    && q.Employee.User!.IsActive);

        // Same day boundaries as CertificationReminderRules.GetStatus, written as date ranges
        // so the database does the filtering:
        //   Expired       days <= 0
        //   ExpiringIn7   1 to 7      ExpiringIn30   8 to 30      ExpiringIn90   31 to 90
        private static IQueryable<EmployeeQualification> InStatus(
            IQueryable<EmployeeQualification> query, CertificationExpiryStatus status, DateTime today)
        {
            var d1 = today.AddDays(1);
            var d8 = today.AddDays(8);
            var d31 = today.AddDays(31);
            var d91 = today.AddDays(91);

            return status switch
            {
                CertificationExpiryStatus.Expired
                    => query.Where(q => q.ExpiryDate != null && q.ExpiryDate < d1),
                CertificationExpiryStatus.ExpiringIn7
                    => query.Where(q => q.ExpiryDate >= d1 && q.ExpiryDate < d8),
                CertificationExpiryStatus.ExpiringIn30
                    => query.Where(q => q.ExpiryDate >= d8 && q.ExpiryDate < d31),
                CertificationExpiryStatus.ExpiringIn90
                    => query.Where(q => q.ExpiryDate >= d31 && q.ExpiryDate < d91),
                _ => query
            };
        }

        private IQueryable<TrainingAssignment> OverdueAssignments(DateTime today)
            => Db.TrainingAssignments
                .AsNoTracking()
                .Where(a => (a.Status == TrainingAssignmentStatus.NotStarted
                            || a.Status == TrainingAssignmentStatus.InProgress)
                    && a.DueDate < today
                    && a.Employee!.Status == "Active"
                    && a.Employee.User!.IsActive);
    }
}