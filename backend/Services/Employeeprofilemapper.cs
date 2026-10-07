using Microsoft.EntityFrameworkCore;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public static class CertificationStatusHelper
    {
        public const int ExpiringWithinDays = 90;

        // Computed on the fly, never stored, so it can't go stale.
        public static string? Evaluate(QualificationType type, DateTime? expiryDate, DateTime utcNow)
        {
            if (type != QualificationType.Certification || expiryDate == null) return null;

            if (expiryDate.Value.Date < utcNow.Date) return "Expired";
            if (expiryDate.Value.Date <= utcNow.Date.AddDays(ExpiringWithinDays)) return "Expiring";
            return "Valid";
        }
    }

    public static class EmployeeProfileMapper
    {
        // Everything needed to build a full profile response
        public static IQueryable<Employee> WithProfile(this IQueryable<Employee> query)
        {
            return query
                .Include(e => e.User)
                .Include(e => e.Department)
                .Include(e => e.EmployeeSkills).ThenInclude(es => es.Skill)
                .Include(e => e.Qualifications)
                .Include(e => e.Experiences);
        }

        public static EmployeeSkillDto ToSkillDto(EmployeeSkill es, Skill skill)
        {
            return new EmployeeSkillDto
            {
                EmployeeSkillId = es.EmployeeSkillId,
                SkillId = es.SkillId,
                SkillName = skill.Name,
                Category = skill.Category.ToString(),
                ProficiencyLevel = es.ProficiencyLevel.ToString()
            };
        }

        public static EmployeeQualificationDto ToQualificationDto(EmployeeQualification q)
        {
            return new EmployeeQualificationDto
            {
                EmployeeQualificationId = q.EmployeeQualificationId,
                QualificationType = q.QualificationType.ToString(),
                Name = q.Name,
                Institution = q.Institution,
                YearCompleted = q.YearCompleted,
                ExpiryDate = q.ExpiryDate,
                CertificationStatus = CertificationStatusHelper.Evaluate(q.QualificationType, q.ExpiryDate, DateTime.UtcNow)
            };
        }

        public static EmployeeExperienceDto ToExperienceDto(EmployeeExperience x)
        {
            return new EmployeeExperienceDto
            {
                EmployeeExperienceId = x.EmployeeExperienceId,
                Company = x.Company,
                Role = x.Role,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                ProjectsAndDuties = x.ProjectsAndDuties
            };
        }

        // The employee must have been loaded with WithProfile().
        public static EmployeeProfileResponse ToResponse(Employee e)
        {
            var u = e.User ?? throw new InvalidOperationException("Employee.User must be loaded.");

            return new EmployeeProfileResponse
            {
                EmployeeId = e.EmployeeId,
                UserId = e.UserId,

                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                PersonalEmail = u.PersonalEmail,
                Phone = u.Phone,
                Gender = u.Gender,
                Race = u.Race,
                Nationality = u.Nationality,
                DateOfBirth = u.DateOfBirth,

                ExternalEmployeeId = e.ExternalEmployeeId,
                EmployeeNumber = e.EmployeeNumber,
                EmploymentType = e.EmploymentType,
                DepartmentId = e.DepartmentId,
                DepartmentName = e.Department?.Name,
                JobTitle = e.JobTitle,
                HireDate = e.HireDate,
                Status = e.Status,

                Skills = e.EmployeeSkills
                    .Where(es => es.Skill != null)
                    .OrderBy(es => es.Skill!.Name)
                    .Select(es => ToSkillDto(es, es.Skill!))
                    .ToList(),

                Qualifications = e.Qualifications
                    .OrderByDescending(q => q.YearCompleted)
                    .Select(ToQualificationDto)
                    .ToList(),

                Experiences = e.Experiences
                    .OrderByDescending(x => x.StartDate)
                    .Select(ToExperienceDto)
                    .ToList()
            };
        }
    }
}