using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.DTOs;
using TalentHub.Models;

namespace TalentHub.Services
{
    public interface IEmployeeProfileCopyService
    {
        // One-time copy of a candidate's skills, qualifications and experience onto a
        // new Employee. Only ADDS entities to the context - the caller saves, so the
        // copy happens inside the caller's transaction.
        Task<ProfileCopyResult> CopyFromCandidateAsync(Employee employee, int candidateId);
    }

    public class EmployeeProfileCopyService : IEmployeeProfileCopyService
    {
        private readonly AppDbContext _db;

        public EmployeeProfileCopyService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<ProfileCopyResult> CopyFromCandidateAsync(Employee employee, int candidateId)
        {
            var skills = await _db.CandidateSkills.AsNoTracking()
                .Where(cs => cs.CandidateId == candidateId)
                .ToListAsync();

            foreach (var cs in skills)
            {
                _db.EmployeeSkills.Add(new EmployeeSkill
                {
                    Employee = employee,
                    SkillId = cs.SkillId,
                    ProficiencyLevel = cs.ProficiencyLevel
                });
            }

            var qualifications = await _db.CandidateQualifications.AsNoTracking()
                .Where(q => q.CandidateId == candidateId)
                .ToListAsync();

            foreach (var q in qualifications)
            {
                _db.EmployeeQualifications.Add(new EmployeeQualification
                {
                    Employee = employee,
                    QualificationType = q.QualificationType,
                    Name = q.Name,
                    Institution = q.Institution,
                    YearCompleted = q.YearCompleted,
                    ExpiryDate = null // candidates have no expiry date; employee/HR fills it in later
                });
            }

            var experiences = await _db.CandidateExperiences.AsNoTracking()
                .Where(x => x.CandidateId == candidateId)
                .ToListAsync();

            foreach (var x in experiences)
            {
                _db.EmployeeExperiences.Add(new EmployeeExperience
                {
                    Employee = employee,
                    Company = x.Company,
                    Role = x.Role,
                    StartDate = x.StartDate,
                    EndDate = x.EndDate,
                    ProjectsAndDuties = x.ProjectsAndDuties
                });
            }

            return new ProfileCopyResult(skills.Count, qualifications.Count, experiences.Count);
        }
    }
}