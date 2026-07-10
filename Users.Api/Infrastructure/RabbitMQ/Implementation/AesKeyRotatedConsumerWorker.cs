using Users.Api.Infrastructure.RabbitMQ.Interface;
using Users.Api.Models.Messages;
using Users.Api.Repositories.Interface;

namespace Users.Api.Infrastructure.RabbitMQ.Implementation
{
    public class AesKeyRotatedConsumerWorker : BackgroundService
    {
        private readonly IGenericRabbitMQConsumer<AesKeyRotatedEvent> _consumer;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IGenericRabbitMQService<AesKeyRotatedEvent> _genericRabbitMQService;

        public AesKeyRotatedConsumerWorker(
            IGenericRabbitMQConsumer<AesKeyRotatedEvent> consumer,
            IServiceScopeFactory scopeFactory,
            IGenericRabbitMQService<AesKeyRotatedEvent> genericRabbitMQService)
        {
            _consumer = consumer;
            _scopeFactory = scopeFactory;
            _genericRabbitMQService = genericRabbitMQService;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await _consumer.StartConsumingAsync(
                hostName: "rabbitmq",
                queueName: "aes-key-rotated-queue",
                handleMessage: async (message) =>
                {
                    using var scope = _scopeFactory.CreateScope();
                    var patientsRepository = scope.ServiceProvider.GetRequiredService<IPatientsRepository>();

                    var patient = await patientsRepository.GetByIdentityIdAsync(message.IdentityId);
                    if (patient != null)
                    {
                        patient.EncryptedAesKey = message.EncryptedAesKey;
                        await patientsRepository.UpdateAsync(patient);
                    }

                    // Fan out to the other services holding a denormalized copy.
                    await _genericRabbitMQService.PublishAsync(message, "accessrequest-aes-key-rotated-queue");
                    await _genericRabbitMQService.PublishAsync(message, "medicaldata-aes-key-rotated-queue");
                    await _genericRabbitMQService.PublishAsync(message, "diagnostics-aes-key-rotated-queue");
                });
        }
    }
}