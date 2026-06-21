using Auth.Api.Infrastructure.RabbitMQ.Interface;
using Auth.Api.Mappings;
using Auth.Api.Models.Domain;
using Auth.Api.Models.Messages;
using Auth.Api.Repositories.Interface;

namespace Auth.Api.Infrastructure.RabbitMQ.Implementation
{
    public class UserCreatedConsumerWorker : BackgroundService
    {
        private readonly IGenericRabbitMQConsumer<UserCreatedResponseEvent> _consumer;
        private readonly IServiceScopeFactory _scopeFactory;

        public UserCreatedConsumerWorker(
            IGenericRabbitMQConsumer<UserCreatedResponseEvent> consumer,
            IServiceScopeFactory scopeFactory)
        {
            _consumer = consumer;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await _consumer.StartConsumingAsync(
                hostName: "rabbitmq",
                queueName: "user-created-response-queue",
                handleMessage: async (message) =>
                {
                    using var scope = _scopeFactory.CreateScope();
                    var usersRepository = scope.ServiceProvider.GetRequiredService<IUsersRepository>();

                    UserCreatedResponseEvent identityCreatedEvent = message;

                    User user = Mapper.ToUser(identityCreatedEvent);

                    await usersRepository.CreateAsync(user);
                });
        }
    }
}