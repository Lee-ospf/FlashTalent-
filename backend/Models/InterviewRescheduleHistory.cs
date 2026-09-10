namespace TalentHub.Models
{
    public class InterviewRescheduleHistory
    {
        public int InterviewRescheduleHistoryId { get; set; }
        public int InterviewId { get; set; }
        public Interview? Interview { get; set; }
        public DateTime OldScheduledAt { get; set; }
        public DateTime NewScheduledAt { get; set; }
        public string Reason { get; set; } = string.Empty;
        public int ChangedByUserId { get; set; }
        public User? ChangedByUser { get; set; }
        public DateTime ChangedAt { get; set; }
    }
}
