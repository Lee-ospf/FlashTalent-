using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;//for converting enums to string when they are saved in the database
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
        public DbSet<Recruiter> Recruiters => Set<Recruiter>();

        public DbSet<Vacancy> Vacancies => Set<Vacancy>();
        public DbSet<Interview> Interviews => Set<Interview>();
        public DbSet<Skill> Skills => Set<Skill>();
        public DbSet<CandidateSkill> CandidateSkills => Set<CandidateSkill>();
        public DbSet<CandidateQualification> CandidateQualifications => Set<CandidateQualification>();
        public DbSet<CandidateExperience> CandidateExperiences => Set<CandidateExperience>();
        public DbSet<Client> Clients => Set<Client>();
        public DbSet<Address> Addresses => Set<Address>();
        public DbSet<Department> Departments => Set<Department>();
        public DbSet<VacancyChangeHistory> VacancyChangeHistories => Set<VacancyChangeHistory>();
        public DbSet<PrescreeningTemplate> PrescreeningTemplates => Set<PrescreeningTemplate>();
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ---------- Address: one-to-many from Candidate, type-flagged ----------
            modelBuilder.Entity<Address>()
                .HasOne(a => a.Candidate)
                .WithMany(c => c.Addresses)
                .HasForeignKey(a => a.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PrescreeningTemplate>()
                 .HasOne(t => t.UploadedByUser)
                 .WithMany()
                 .HasForeignKey(t => t.UploadedByUserId)
                 .OnDelete(DeleteBehavior.Restrict);


            modelBuilder.Entity<VacancyChangeHistory>()
                 .HasOne(h => h.ChangedByUser)
                 .WithMany()
                 .HasForeignKey(h => h.ChangedByUserId)
                 .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Address>()
                .Property(a => a.AddressType)
                .HasConversion<string>()
                .HasMaxLength(20);

            // A candidate can only have one address of each type (one Residential, one Postal)
            modelBuilder.Entity<Address>()
                .HasIndex(a => new { a.CandidateId, a.AddressType })
                .IsUnique();

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
               .Property(s => s.Category)
               .HasConversion<string>()
               .HasMaxLength(20);
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

            modelBuilder.Entity<CandidateDocument>()
                  .HasOne(d => d.Qualification)
                  .WithMany()
                  .HasForeignKey(d => d.QualificationId)
                   .OnDelete(DeleteBehavior.Restrict); 
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

            modelBuilder.Entity<Vacancy>()
    .HasOne(v => v.Recruiter)
    .WithMany(r => r.VacanciesCreated)
    .HasForeignKey(v => v.CreatedByRecruiterId)
    .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<VacancyDocument>()
    .Property(v => v.DocumentType)
    .HasConversion<string>()
    .HasMaxLength(30);

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

            modelBuilder.Entity<Interview>()
    .HasOne(i => i.Application)
    .WithMany(a => a.Interviews)
    .HasForeignKey(i => i.ApplicationId)
    .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Interview>()
                .HasOne(i => i.ScheduledByUser)
                .WithMany()
                .HasForeignKey(i => i.ScheduledByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // One application can't have two rounds with the same number
            modelBuilder.Entity<Interview>()
                .HasIndex(i => new { i.ApplicationId, i.RoundNumber })
                .IsUnique();

            // convert all enums to strings in the database for readability
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType.IsEnum)
                    {
                        var converterType = typeof(EnumToStringConverter<>).MakeGenericType(property.ClrType);
                        var converter = (ValueConverter)Activator.CreateInstance(converterType, (ConverterMappingHints?)null)!;
                        property.SetValueConverter(converter);
                    }
                }
            }

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