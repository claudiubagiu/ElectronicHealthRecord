using AccessRequests.Api.Infrastructure.RabbitMQ.Interface;
using AccessRequests.Api.Models.Domain;
using AccessRequests.Api.Models.Messages;
using AccessRequests.Api.Repositories.Interface;
using AutoMapper;

namespace AccessRequests.Api.Infrastructure.RabbitMQ.Implementation
{
    public class UserCreatedConsumerWorker : BackgroundService
    {
        private readonly IGenericRabbitMQConsumer<UserCreatedEvent> _consumer;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IMapper _mapper;

        public UserCreatedConsumerWorker(IGenericRabbitMQConsumer<UserCreatedEvent> consumer,
                                             IServiceScopeFactory scopeFactory,
                                             IMapper mapper)
        {
            _consumer = consumer;
            _scopeFactory = scopeFactory;
            _mapper = mapper;
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

                    User user = _mapper.Map<User>(userCreatedEvent);
                    user = await usersRepository.CreateAsync(user);
                });
        }
    }
}
