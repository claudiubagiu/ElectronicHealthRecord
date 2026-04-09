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
        private readonly IGenericRabbitMQService<UserCreatedEvent> _genericRabbitMQService;
        private readonly IGenericRabbitMQService<UserCreatedResponseEvent> _genericRabbitMQService1;

        public IdentityCreatedConsumerWorker(
            IGenericRabbitMQConsumer<IdentityCreatedEvent> consumer,
            IServiceScopeFactory scopeFactory,
            IMapper mapper,
            IGenericRabbitMQService<UserCreatedEvent> genericRabbitMQService,
            IGenericRabbitMQService<UserCreatedResponseEvent> genericRabbitMQService1,
            IGenericRabbitMQService<UserCreatedResponseEvent> genericRabbitMQService2)
        {
            _consumer = consumer;
            _scopeFactory = scopeFactory;
            _mapper = mapper;
            _genericRabbitMQService = genericRabbitMQService;
            _genericRabbitMQService1 = genericRabbitMQService1;
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
                    var labTechniciansRepository = scope.ServiceProvider.GetRequiredService<ILaboratoryTechniciansRepository>();
                    var pharmacistsRepository = scope.ServiceProvider.GetRequiredService<IPharmacistsRepository>();

                    IdentityCreatedEvent identityCreatedEvent = message;

                    if (identityCreatedEvent.Role.Equals("Patient"))
                    {
                        Patient patient = _mapper.Map<Patient>(identityCreatedEvent);
                        patient = await patientsRepository.CreateAsync(patient);

                        UserCreatedResponseEvent userCreatedResponseEvent = _mapper.Map<UserCreatedResponseEvent>(patient);
                        await _genericRabbitMQService1.PublishAsync(userCreatedResponseEvent, "user-created-response-queue");

                        UserCreatedEvent userCreatedEvent = _mapper.Map<UserCreatedEvent>(patient);
                        userCreatedEvent.Role = identityCreatedEvent.Role;
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medications-user-created-queue");
                    }
                    else if (identityCreatedEvent.Role == "Doctor")
                    {
                        Doctor doctor = _mapper.Map<Doctor>(identityCreatedEvent);
                        await doctorsRepository.CreateAsync(doctor);

                        UserCreatedResponseEvent userCreatedResponseEvent = _mapper.Map<UserCreatedResponseEvent>(doctor);
                        await _genericRabbitMQService1.PublishAsync(userCreatedResponseEvent, "user-created-response-queue");

                        UserCreatedEvent userCreatedEvent = _mapper.Map<UserCreatedEvent>(doctor);
                        userCreatedEvent.Role = identityCreatedEvent.Role;
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medications-user-created-queue");
                    }
                    else if (identityCreatedEvent.Role == "LaboratoryTechnician")
                    {
                        LaboratoryTechnician labTechnician = _mapper.Map<LaboratoryTechnician>(identityCreatedEvent);
                        await labTechniciansRepository.CreateAsync(labTechnician);

                        UserCreatedResponseEvent userCreatedResponseEvent = _mapper.Map<UserCreatedResponseEvent>(labTechnician);
                        await _genericRabbitMQService1.PublishAsync(userCreatedResponseEvent, "user-created-response-queue");

                        UserCreatedEvent userCreatedEvent = _mapper.Map<UserCreatedEvent>(labTechnician);
                        userCreatedEvent.Role = identityCreatedEvent.Role;
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medications-user-created-queue");
                    }
                    else if (identityCreatedEvent.Role == "Pharmacist")
                    {
                        Pharmacist pharmacist = _mapper.Map<Pharmacist>(identityCreatedEvent);
                        await pharmacistsRepository.CreateAsync(pharmacist);

                        UserCreatedResponseEvent userCreatedResponseEvent = _mapper.Map<UserCreatedResponseEvent>(pharmacist);
                        await _genericRabbitMQService1.PublishAsync(userCreatedResponseEvent, "user-created-response-queue");

                        UserCreatedEvent userCreatedEvent = _mapper.Map<UserCreatedEvent>(pharmacist);
                        userCreatedEvent.Role = identityCreatedEvent.Role;
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medications-user-created-queue");
                    }
                });
        }
    }
}