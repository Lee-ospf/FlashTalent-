using SendGrid;
using SendGrid.Helpers.Mail;
using System;

namespace TalentHub.Services
{
    public interface INotificationEmailSender
    {
        Task<bool> SendAsync(string toEmail, string subject, string body);
    }

    public class SendGridEmailSender : INotificationEmailSender
    {
        private readonly ISendGridClient _client;
        private readonly string _fromEmail;
        private readonly ILogger<SendGridEmailSender> _logger;

        public SendGridEmailSender(ISendGridClient client, IConfiguration config, ILogger<SendGridEmailSender> logger)
        {
            _client = client;
            _fromEmail = config["SendGrid:FromEmail"]
                ?? throw new InvalidOperationException("SendGrid:FromEmail is missing in appsettings.json");
            _logger = logger;
        }

        public async Task<bool> SendAsync(string toEmail, string subject, string body)
        {
            var msg = MailHelper.CreateSingleEmail(
                new EmailAddress(_fromEmail),
                new EmailAddress(toEmail),
                subject,
                plainTextContent: body,
                htmlContent: null);

            var response = await _client.SendEmailAsync(msg);
            if (!response.IsSuccessStatusCode)
            {
                var responseBody = await response.Body.ReadAsStringAsync();
                _logger.LogError(
                    "SendGrid rejected email to {ToEmail}. Status: {StatusCode}. Body: {Body}",
                    toEmail, response.StatusCode, responseBody);
            }
            return response.IsSuccessStatusCode;
        }
    }
}