using AccessRequests.Api.Infrastructure.RabbitMQ.Interface;
using AccessRequests.Api.Mappings;
using AccessRequests.Api.Models.Domain;
using AccessRequests.Api.Models.Messages;
using AccessRequests.Api.Repositories.Interface;

namespace AccessRequests.Api.Infrastructure.RabbitMQ.Implementation
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
                queueName: "accessrequest-user-created-queue",
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