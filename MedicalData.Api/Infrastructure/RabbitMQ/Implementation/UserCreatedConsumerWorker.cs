using MedicalData.Api.Infrastructure.RabbitMQ.Interface;
using MedicalData.Api.Mappings;
using MedicalData.Api.Models.Domain;
using MedicalData.Api.Models.Messages;
using MedicalData.Api.Repositories.Interface;

namespace MedicalData.Api.Infrastructure.RabbitMQ.Implementation
{
    public class UserCreatedConsumerWorker : BackgroundService
    {
        private readonly IGenericRabbitMQConsumer<UserCreatedEvent> _consumer;
        private readonly IServiceScopeFactory _scopeFactory;

        public UserCreatedConsumerWorker(
            IGenericRabbitMQConsumer<UserCreatedEvent> consumer,
            IServiceScopeFactory scopeFactory)
        {
            _consumer = consumer;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await _consumer.StartConsumingAsync(
                hostName: "rabbitmq",
                queueName: "medicaldata-user-created-queue",
                handleMessage: async (message) =>
                {
                    using var scope = _scopeFactory.CreateScope();
                    var usersRepository = scope.ServiceProvider
                        .GetRequiredService<IUsersRepository>();

                    User user = Mapper.ToUser(message);
                    await usersRepository.CreateAsync(user);
                });
        }
    }
}