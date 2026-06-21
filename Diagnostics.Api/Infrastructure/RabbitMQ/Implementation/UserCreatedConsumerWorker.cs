using Diagnostics.Api.Infrastructure.RabbitMQ.Interface;
using Diagnostics.Api.Mappings;
using Diagnostics.Api.Models.Domain;
using Diagnostics.Api.Models.Messages;
using Diagnostics.Api.Repositories.Interface;

namespace Diagnostics.Api.Infrastructure.RabbitMQ.Implementation
{
    public class UserCreatedConsumerWorker : BackgroundService
    {
        private readonly IGenericRabbitMQConsumer<UserCreatedEvent> _consumer;
        private readonly IServiceScopeFactory _scopeFactory;

        public UserCreatedConsumerWorker(IGenericRabbitMQConsumer<UserCreatedEvent> consumer,
                                             IServiceScopeFactory scopeFactory)
        {
            _consumer = consumer;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await _consumer.StartConsumingAsync(
                hostName: "rabbitmq",
                queueName: "user-created-queue",
                handleMessage: async (message) =>
                {
                    using var scope = _scopeFactory.CreateScope();
                    var usersRepository = scope.ServiceProvider.GetRequiredService<IUsersRepository>();

                    UserCreatedEvent userCreatedEvent = message;

                    User user = Mapper.ToUser(userCreatedEvent);
                    user = await usersRepository.CreateAsync(user);
                });
        }
    }
}