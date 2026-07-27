using Microsoft.EntityFrameworkCore;
using TalentHub.Data;
using TalentHub.Models;

namespace TalentHub.Services
{
    public class VacancyClosingDateService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<VacancyClosingDateService> _logger;

        // How often to check — every hour is reasonable for a recruitment platform
        private readonly TimeSpan _interval = TimeSpan.FromHours(1);

        public VacancyClosingDateService(
            IServiceScopeFactory scopeFactory,
            ILogger<VacancyClosingDateService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Vacancy closing date service started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                await CloseExpiredVacancies();
                await Task.Delay(_interval, stoppingToken);
            }
        }

        private async Task CloseExpiredVacancies()
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var expired = await db.Vacancies
                    .Where(v =>
                        v.Status == VacancyStatus.Published &&
                        v.ClosingDate.HasValue &&
                        v.ClosingDate.Value < DateTime.UtcNow)
                    .ToListAsync();

                if (!expired.Any()) return;

                foreach (var vacancy in expired)
                {
                    vacancy.Status = VacancyStatus.Closed;
                    _logger.LogInformation(
                        "Auto-closed vacancy {VacancyId} '{Title}' — closing date was {ClosingDate}",
                        vacancy.VacancyId, vacancy.Title, vacancy.ClosingDate);
                }

                await db.SaveChangesAsync();
                _logger.LogInformation("Auto-closed {Count} expired vacancies.", expired.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in vacancy closing date service.");
            }
        }
    }
}