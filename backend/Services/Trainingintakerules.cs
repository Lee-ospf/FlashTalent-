namespace TalentHub.Services
{
    public enum TrainingIntakeState
    {
        Upcoming,
        Running,
        Ended
    }

    // "Today" for business rules (intake dates, due dates, overdue).
    // South Africa is UTC+2 all year with no daylight saving, so a fixed offset is safe
    // and avoids Windows/Linux time zone name differences.
    public static class BusinessClock
    {
        private const int OffsetHours = 2;

        public static DateTime Today => DateTime.UtcNow.AddHours(OffsetHours).Date;
    }

    public static class TrainingIntakeRules
    {
        // Ended  = closed early, or the end date has passed (the end date itself is still Running)
        // Upcoming = not started yet
        // Running = everything else
        public static TrainingIntakeState GetState(DateTime? closedAt, DateTime startDate, DateTime endDate, DateTime today)
        {
            if (closedAt != null || endDate.Date < today)
                return TrainingIntakeState.Ended;

            if (startDate.Date > today)
                return TrainingIntakeState.Upcoming;

            return TrainingIntakeState.Running;
        }
    }
}