using AccessRequests.Api.Infrastructure.RabbitMQ.Interface;
using AccessRequests.Api.Models.Messages;
using AccessRequests.Api.Repositories.Interface;

namespace AccessRequests.Api.Infrastructure.RabbitMQ.Implementation
{
    /// <summary>
    /// Consumes AesKeyRotatedEvent fanned out by Users.Api after a patient
    /// rotates their PatientMasterKey. Updates this service's own
    /// denormalized User.EncryptedAesKey copy by UserId — this service
    /// never saw the patient's IdentityId (Auth.Api's id), only the UserId
    /// originally assigned by Users.Api.
    /// </summary>
    public class AesKeyRotatedConsumerWorker : BackgroundService
    {
        private readonly IGenericRabbitMQConsumer<AesKeyRotatedEvent> _consumer;
        private readonly IServiceScopeFactory _scopeFactory;

        public AesKeyRotatedConsumerWorker(
            IGenericRabbitMQConsumer<AesKeyRotatedEvent> consumer,
            IServiceScopeFactory scopeFactory)
        {
            _consumer = consumer;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await _consumer.StartConsumingAsync(
                hostName: "rabbitmq",
                queueName: "accessrequest-aes-key-rotated-queue",
                handleMessage: async (message) =>
                {
                    using var scope = _scopeFactory.CreateScope();
                    var usersRepository = scope.ServiceProvider.GetRequiredService<IUsersRepository>();

                    await usersRepository.UpdateEncryptedAesKeyAsync(message.UserId, message.EncryptedAesKey);
                });
        }
    }
}