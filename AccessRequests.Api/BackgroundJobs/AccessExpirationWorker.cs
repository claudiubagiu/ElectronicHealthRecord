using AccessRequests.Api.Services.Interface;

namespace AccessRequests.Api.BackgroundJobs
{
    public class AccessExpirationWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AccessExpirationWorker> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(5);

        public AccessExpirationWorker(
            IServiceScopeFactory scopeFactory,
            ILogger<AccessExpirationWorker> logger,
            IHttpClientFactory httpClientFactory)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("AccessExpirationWorker started. Checking every {Interval} minutes.",
                CheckInterval.TotalMinutes);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessExpiredRequestsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while processing expired access requests.");
                }

                await Task.Delay(CheckInterval, stoppingToken);
            }
        }

        private async Task ProcessExpiredRequestsAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var accessRequestService = scope.ServiceProvider.GetRequiredService<IAccessRequestService>();
            var accessRequestRepo = scope.ServiceProvider
                .GetRequiredService<Repositories.Interface.IAccessRequestRepository>();

            var expiredRequests = await accessRequestRepo.GetExpiredApprovedAsync();

            if (expiredRequests.Count == 0) return;

            _logger.LogInformation("Found {Count} expired access request(s) to process.", expiredRequests.Count);

            var count = await accessRequestService.ExpireOverdueRequestsAsync();

            var httpClient = _httpClientFactory.CreateClient("MedicationsApi");

            foreach (var request in expiredRequests)
            {
                try
                {
                    var url = $"api/Medication/envelopes/internal/user/{request.DoctorId}/patient/{request.PatientId}";
                    var response = await httpClient.DeleteAsync(url, ct);

                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation(
                            "Deleted medication envelopes for Doctor {DoctorId} / Patient {PatientId}.",
                            request.DoctorId, request.PatientId);
                    }
                    else
                    {
                        _logger.LogWarning(
                            "Failed to delete medication envelopes for Doctor {DoctorId} / Patient {PatientId}. Status: {Status}",
                            request.DoctorId, request.PatientId, response.StatusCode);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Error deleting medication envelopes for Doctor {DoctorId} / Patient {PatientId}.",
                        request.DoctorId, request.PatientId);
                }
            }

            _logger.LogInformation("Finished processing {Count} expired access request(s).", count);
        }
    }
}
