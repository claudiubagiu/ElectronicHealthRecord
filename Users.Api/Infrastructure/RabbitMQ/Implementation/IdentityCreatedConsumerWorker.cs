using AutoMapper;
using Users.Api.Infrastructure.RabbitMQ.Interface;
using Users.Api.Models.Domain;
using Users.Api.Models.Messages;
using Users.Api.Repositories.Interface;

namespace Users.Api.Infrastructure.RabbitMQ.Implementation
{
    public class IdentityCreatedConsumerWorker : BackgroundService
    {
        private readonly IGenericRabbitMQConsumer<IdentityCreatedEvent> _consumer;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IMapper _mapper;

        public IdentityCreatedConsumerWorker(IGenericRabbitMQConsumer<IdentityCreatedEvent> consumer, 
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
                queueName: "identity-created-queue",
                handleMessage: async (message) =>
                {
                    using var scope = _scopeFactory.CreateScope();
                    var patientsRepository = scope.ServiceProvider.GetRequiredService<IPatientsRepository>();
                    var doctorsRepository = scope.ServiceProvider.GetRequiredService<IDoctorsRepository>();

                    IdentityCreatedEvent identityCreatedEvent = message;

                    if (identityCreatedEvent.Role.Equals("Patient"))
                    {
                        Patient patient = _mapper.Map<Patient>(identityCreatedEvent);
                        await patientsRepository.CreateAsync(patient);
                    }
                    else if (identityCreatedEvent.Role == "Doctor")
                    {
                        Doctor doctor = _mapper.Map<Doctor>(identityCreatedEvent);
                        await doctorsRepository.CreateAsync(doctor);
                    }
                });
        }
    }
}
