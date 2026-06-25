using Microsoft.EntityFrameworkCore;
using TalentHub.Models;

namespace TalentHub.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {}

        public DbSet<User> Users => Set<User>();
        public DbSet<Candidate> Candidates => Set<Candidate>();
        public DbSet<CandidateDocument> CandidateDocuments => Set<CandidateDocument>();
        public DbSet<Application> Applications => Set<Application>();
        public DbSet<ApplicationStatusHistory> ApplicationStatusHistories => Set<ApplicationStatusHistory>();
        public DbSet<Prescreening> Prescreenings => Set<Prescreening>();
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<Employee> Employees => Set<Employee>();
        public DbSet<TalentPool> TalentPoolEntries => Set<TalentPool>();

        public DbSet<Vacancy> Vacancies => Set<Vacancy>();
        public DbSet<Interview> Interviews => Set<Interview>();
        public DbSet<Skill> Skills => Set<Skill>();
        public DbSet<CandidateSkill> CandidateSkills => Set<CandidateSkill>();
        public DbSet<CandidateQualification> CandidateQualifications => Set<CandidateQualification>();
        public DbSet<CandidateExperience> CandidateExperiences => Set<CandidateExperience>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ---------- CandidateQualification ----------
            modelBuilder.Entity<CandidateQualification>()
                .HasOne(q => q.Candidate)
                .WithMany(c => c.Qualifications)
                .HasForeignKey(q => q.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CandidateQualification>()
                .Property(q => q.QualificationType)
                .HasConversion<string>()
                .HasMaxLength(20);

            // ---------- CandidateExperience ----------
            modelBuilder.Entity<CandidateExperience>()
                .HasOne(e => e.Candidate)
                .WithMany(c => c.Experiences)
                .HasForeignKey(e => e.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---------- CandidateSkill: store proficiency as readable text ----------
            modelBuilder.Entity<CandidateSkill>()
                .Property(cs => cs.ProficiencyLevel)
                .HasConversion<string>()
                .HasMaxLength(20);

            // ---------- CandidateSkill: many-to-many join between Candidate and Skill ----------
            modelBuilder.Entity<CandidateSkill>()
                .HasOne(cs => cs.Candidate)
                .WithMany(c => c.CandidateSkills)
                .HasForeignKey(cs => cs.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CandidateSkill>()
                .HasOne(cs => cs.Skill)
                .WithMany(s => s.CandidateSkills)
                .HasForeignKey(cs => cs.SkillId)
                .OnDelete(DeleteBehavior.Cascade);

            // A candidate can't have the same skill listed twice
            modelBuilder.Entity<CandidateSkill>()
                .HasIndex(cs => new { cs.CandidateId, cs.SkillId })
                .IsUnique();

            // A skill name must be unique (no duplicate "C#" entries created by Admin)
            modelBuilder.Entity<Skill>()
                .HasIndex(s => s.Name)
                .IsUnique();
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Candidate>()
                .HasIndex(c => c.UserId)
                .IsUnique();

            modelBuilder.Entity<Candidate>()
                .HasOne(c => c.User)
                .WithOne(u => u.Candidate)
                .HasForeignKey<Candidate>(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CandidateDocument>()
                .HasOne(d => d.Candidate)
                .WithMany(c => c.Documents)
                .HasForeignKey(d => d.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Application>()
                .HasOne(a => a.Candidate)
                .WithMany(c => c.Applications)
                .HasForeignKey(a => a.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Application>()
                .HasOne(a => a.Vacancy)
                .WithMany(v => v.Applications)
                .HasForeignKey(a => a.VacancyId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Application>()
                .HasIndex(a => new { a.CandidateId, a.VacancyId })
                .IsUnique();

            modelBuilder.Entity<ApplicationStatusHistory>()
                .HasOne(h => h.Application)
                .WithMany(a => a.StatusHistory)
                .HasForeignKey(h => h.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ApplicationStatusHistory>()
                .HasOne(h => h.ChangedByUser)
                .WithMany()
                .HasForeignKey(h => h.ChangedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Prescreening>()
                .HasIndex(p => p.ApplicationId)
                .IsUnique();

            modelBuilder.Entity<Prescreening>()
                .HasOne(p => p.Application)
                .WithOne(a => a.Prescreening)
                .HasForeignKey<Prescreening>(p => p.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasIndex(e => e.UserId)
                .IsUnique();

            modelBuilder.Entity<Employee>()
                .HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Employee>()
                .HasOne(e => e.SourceApplication)
                .WithMany()
                .HasForeignKey(e => e.SourceApplicationId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<TalentPool>()
                .HasIndex(t => t.CandidateId)
                .IsUnique();

            modelBuilder.Entity<TalentPool>()
                .HasOne(t => t.Candidate)
                .WithOne(c => c.TalentPoolEntry)
                .HasForeignKey<TalentPool>(t => t.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TalentPool>()
                .HasOne(t => t.LastVacancy)
                .WithMany()
                .HasForeignKey(t => t.LastVacancyId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            modelBuilder.Entity<User>().Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
            modelBuilder.Entity<CandidateDocument>().Property(d => d.DocumentType).HasConversion<string>().HasMaxLength(30);
            modelBuilder.Entity<Application>().Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
            modelBuilder.Entity<ApplicationStatusHistory>().Property(h => h.OldStatus).HasConversion<string>().HasMaxLength(20);
            modelBuilder.Entity<ApplicationStatusHistory>().Property(h => h.NewStatus).HasConversion<string>().HasMaxLength(20);
            modelBuilder.Entity<Prescreening>().Property(p => p.Outcome).HasConversion<string>().HasMaxLength(20);
            modelBuilder.Entity<Notification>().Property(n => n.NotificationType).HasConversion<string>().HasMaxLength(30);
        }
    }
}