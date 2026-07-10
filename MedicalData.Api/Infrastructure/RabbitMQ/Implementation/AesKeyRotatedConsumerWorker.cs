using MedicalData.Api.Infrastructure.RabbitMQ.Interface;
using MedicalData.Api.Models.Messages;
using MedicalData.Api.Repositories.Interface;

namespace MedicalData.Api.Infrastructure.RabbitMQ.Implementation
{
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
                queueName: "medicaldata-aes-key-rotated-queue",
                handleMessage: async (message) =>
                {
                    using var scope = _scopeFactory.CreateScope();
                    var usersRepository = scope.ServiceProvider.GetRequiredService<IUsersRepository>();

                    await usersRepository.UpdateEncryptedAesKeyAsync(message.UserId, message.EncryptedAesKey);
                });
        }
    }
}