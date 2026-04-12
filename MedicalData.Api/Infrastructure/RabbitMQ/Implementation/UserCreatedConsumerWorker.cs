using AutoMapper;
using MedicalData.Api.Infrastructure.RabbitMQ.Interface;
using MedicalData.Api.Models.Domain;
using MedicalData.Api.Models.Messages;
using MedicalData.Api.Repositories.Interface;

namespace MedicalData.Api.Infrastructure.RabbitMQ.Implementation
{
    public class UserCreatedConsumerWorker : BackgroundService
    {
        private readonly IGenericRabbitMQConsumer<UserCreatedEvent> _consumer;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IMapper _mapper;

        public UserCreatedConsumerWorker(
            IGenericRabbitMQConsumer<UserCreatedEvent> consumer,
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
                queueName: "medicaldata-user-created-queue",
                handleMessage: async (message) =>
                {
                    using var scope = _scopeFactory.CreateScope();
                    var usersRepository = scope.ServiceProvider
                        .GetRequiredService<IUsersRepository>();

                    User user = _mapper.Map<User>(message);
                    await usersRepository.CreateAsync(user);
                });
        }
    }
}