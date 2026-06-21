using Users.Api.Infrastructure.RabbitMQ.Interface;
using Users.Api.Mappings;
using Users.Api.Models.Domain;
using Users.Api.Models.Messages;
using Users.Api.Repositories.Interface;

namespace Users.Api.Infrastructure.RabbitMQ.Implementation
{
    public class IdentityCreatedConsumerWorker : BackgroundService
    {
        private readonly IGenericRabbitMQConsumer<IdentityCreatedEvent> _consumer;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IGenericRabbitMQService<UserCreatedEvent> _genericRabbitMQService;
        private readonly IGenericRabbitMQService<UserCreatedResponseEvent> _genericRabbitMQService1;

        public IdentityCreatedConsumerWorker(
            IGenericRabbitMQConsumer<IdentityCreatedEvent> consumer,
            IServiceScopeFactory scopeFactory,
            IGenericRabbitMQService<UserCreatedEvent> genericRabbitMQService,
            IGenericRabbitMQService<UserCreatedResponseEvent> genericRabbitMQService1,
            IGenericRabbitMQService<UserCreatedResponseEvent> genericRabbitMQService2)
        {
            _consumer = consumer;
            _scopeFactory = scopeFactory;
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
                    var medicalAssistantsRepository = scope.ServiceProvider.GetRequiredService<IMedicalAssistantsRepository>();

                    IdentityCreatedEvent identityCreatedEvent = message;

                    if (identityCreatedEvent.Role.Equals("Patient"))
                    {
                        Patient patient = Mapper.ToPatient(identityCreatedEvent);
                        patient = await patientsRepository.CreateAsync(patient);

                        UserCreatedResponseEvent userCreatedResponseEvent = Mapper.ToUserCreatedResponseEvent(patient);
                        await _genericRabbitMQService1.PublishAsync(userCreatedResponseEvent, "user-created-response-queue");

                        UserCreatedEvent userCreatedEvent = Mapper.ToUserCreatedEvent(patient);
                        userCreatedEvent.Role = identityCreatedEvent.Role;
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "accessrequest-user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medications-user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medicaldata-user-created-queue");
                    }
                    else if (identityCreatedEvent.Role == "Doctor")
                    {
                        Doctor doctor = Mapper.ToDoctor(identityCreatedEvent);
                        await doctorsRepository.CreateAsync(doctor);

                        UserCreatedResponseEvent userCreatedResponseEvent = Mapper.ToUserCreatedResponseEvent(doctor);
                        await _genericRabbitMQService1.PublishAsync(userCreatedResponseEvent, "user-created-response-queue");

                        UserCreatedEvent userCreatedEvent = Mapper.ToUserCreatedEvent(doctor);
                        userCreatedEvent.Role = identityCreatedEvent.Role;
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "accessrequest-user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medications-user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medicaldata-user-created-queue");
                    }
                    else if (identityCreatedEvent.Role == "LaboratoryTechnician")
                    {
                        LaboratoryTechnician labTechnician = Mapper.ToLaboratoryTechnician(identityCreatedEvent);
                        await labTechniciansRepository.CreateAsync(labTechnician);

                        UserCreatedResponseEvent userCreatedResponseEvent = Mapper.ToUserCreatedResponseEvent(labTechnician);
                        await _genericRabbitMQService1.PublishAsync(userCreatedResponseEvent, "user-created-response-queue");

                        UserCreatedEvent userCreatedEvent = Mapper.ToUserCreatedEvent(labTechnician);
                        userCreatedEvent.Role = identityCreatedEvent.Role;
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "accessrequest-user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medications-user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medicaldata-user-created-queue");
                    }
                    else if (identityCreatedEvent.Role == "Pharmacist")
                    {
                        Pharmacist pharmacist = Mapper.ToPharmacist(identityCreatedEvent);
                        await pharmacistsRepository.CreateAsync(pharmacist);

                        UserCreatedResponseEvent userCreatedResponseEvent = Mapper.ToUserCreatedResponseEvent(pharmacist);
                        await _genericRabbitMQService1.PublishAsync(userCreatedResponseEvent, "user-created-response-queue");

                        UserCreatedEvent userCreatedEvent = Mapper.ToUserCreatedEvent(pharmacist);
                        userCreatedEvent.Role = identityCreatedEvent.Role;
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "accessrequest-user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medications-user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medicaldata-user-created-queue");
                    }
                    else if (identityCreatedEvent.Role == "MedicalAssistant")
                    {
                        MedicalAssistant medicalAssistant = Mapper.ToMedicalAssistant(identityCreatedEvent);
                        await medicalAssistantsRepository.CreateAsync(medicalAssistant);

                        UserCreatedResponseEvent userCreatedResponseEvent = Mapper.ToUserCreatedResponseEvent(medicalAssistant);
                        await _genericRabbitMQService1.PublishAsync(userCreatedResponseEvent, "user-created-response-queue");

                        UserCreatedEvent userCreatedEvent = Mapper.ToUserCreatedEvent(medicalAssistant);
                        userCreatedEvent.Role = identityCreatedEvent.Role;
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "accessrequest-user-created-queue");
                        await _genericRabbitMQService.PublishAsync(userCreatedEvent, "medicaldata-user-created-queue");
                    }
                });
        }
    }
}