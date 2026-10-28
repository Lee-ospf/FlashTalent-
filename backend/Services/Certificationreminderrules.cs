using TalentHub.Models;

namespace TalentHub.Services
{
    // Where a certification stands relative to its expiry date. Used by the HR screens.
    public enum CertificationExpiryStatus
    {
        NoExpiryDate,
        Valid,          // more than 90 days left
        ExpiringIn90,   // 31 to 90 days left
        ExpiringIn30,   // 8 to 30 days left
        ExpiringIn7,    // 1 to 7 days left
        Expired         // the expiry date itself or later
    }

    // What the daily job should do for one certification right now.
    public class CertificationReminderDecision
    {
        // The single reminder to send, or null if nothing should be sent.
        public CertificationReminderPoint? ToSend { get; set; }

        // Reminder points that were reached but must NOT be sent (older points covered by a tighter
        // one, or alerts suppressed for long-expired certificates). The job logs these with
        // WasSent = false so they are never reconsidered.
        public List<CertificationReminderPoint> Covered { get; set; } = new();

        public bool HasWork => ToSend != null || Covered.Count > 0;
    }

    // Pure logic: no database, no clock, no notifications. The caller passes in today's date and
    // the reminder points already logged, so every case can be tried with dates you choose.
    public static class CertificationReminderRules
    {
        // Reminder points, loosest to tightest. The order matters: a later entry is "tighter".
        private static readonly (CertificationReminderPoint Point, int DaysBefore)[] Points =
        {
            (CertificationReminderPoint.Days90, 90),
            (CertificationReminderPoint.Days30, 30),
            (CertificationReminderPoint.Days7, 7),
            (CertificationReminderPoint.Expired, 0)
        };

        // An "expired" alert is only sent if the certificate expired within this many days.
        // Older ones appear on the HR list but send nothing (prevents a flood on the first run).
        public const int ExpiredAlertWindowDays = 30;

        // Calendar days from today to the expiry date. Negative once expired.
        public static int DaysLeft(DateTime expiryDate, DateTime today)
            => (expiryDate.Date - today.Date).Days;

        public static CertificationExpiryStatus GetStatus(DateTime? expiryDate, DateTime today)
        {
            if (expiryDate == null)
                return CertificationExpiryStatus.NoExpiryDate;

            var days = DaysLeft(expiryDate.Value, today);

            if (days <= 0) return CertificationExpiryStatus.Expired;
            if (days <= 7) return CertificationExpiryStatus.ExpiringIn7;
            if (days <= 30) return CertificationExpiryStatus.ExpiringIn30;
            if (days <= 90) return CertificationExpiryStatus.ExpiringIn90;
            return CertificationExpiryStatus.Valid;
        }

        // alreadyLogged = reminder points logged for THIS certification AND THIS expiry date.
        // Renewals need no special handling: a changed expiry date has no log rows yet, so the
        // caller passes an empty set and the cycle starts again.
        public static CertificationReminderDecision Evaluate(
            DateTime expiryDate, DateTime today, IReadOnlyCollection<CertificationReminderPoint> alreadyLogged)
        {
            var decision = new CertificationReminderDecision();
            var days = DaysLeft(expiryDate, today);

            // Every point whose moment has arrived, loosest to tightest
            var reached = Points.Where(p => days <= p.DaysBefore).Select(p => p.Point).ToList();
            if (reached.Count == 0)
                return decision;

            var unlogged = reached.Where(p => !alreadyLogged.Contains(p)).ToList();
            if (unlogged.Count == 0)
                return decision;

            var tightest = reached[^1];

            // Expired long ago (before the window): send nothing, but log everything as covered
            // so the job stops looking at it.
            if (days < -ExpiredAlertWindowDays)
            {
                decision.Covered = unlogged;
                return decision;
            }

            // Send only the tightest point reached, and only if it hasn't been sent yet.
            // Older unlogged points are covered, so the employee never gets a backlog of emails.
            if (!alreadyLogged.Contains(tightest))
            {
                decision.ToSend = tightest;
                decision.Covered = unlogged.Where(p => p != tightest).ToList();
            }
            else
            {
                decision.Covered = unlogged;
            }

            return decision;
        }
    }
}