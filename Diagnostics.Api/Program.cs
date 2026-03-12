using Diagnostics.Api.Data;
using Diagnostics.Api.Extensions;
using Diagnostics.Api.Infrastructure.RabbitMQ.Implementation;
using Diagnostics.Api.Infrastructure.RabbitMQ.Interface;
using Diagnostics.Api.Mappings;
using Diagnostics.Api.Repositories.Implementation;
using Diagnostics.Api.Repositories.Interface;
using Diagnostics.Api.Services.Implementation;
using Diagnostics.Api.Services.Interface;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

builder.Services.AddDbContext<DiagnosticsDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DiagnosticsConnectionString")));

builder.Services.AddAutoMapper(typeof(AutoMapperProfiles));

builder.Services.AddScoped<IUsersRepository, UsersRepository>();
builder.Services.AddScoped<IDiagnosticsService, DiagnosticsService>();
builder.Services.AddScoped<IDiagnosticsRepository, DiagnosticsRepository>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddSingleton<IConnection>(sp =>
{
    var factory = new ConnectionFactory
    {
        HostName = "rabbitmq"
    };

    return factory.CreateConnectionAsync()
                 .GetAwaiter()
                 .GetResult();
});

builder.Services.AddSingleton(typeof(IGenericRabbitMQConsumer<>), typeof(GenericRabbitMQConsumer<>));

builder.Services.AddHostedService<UserCreatedConsumerWorker>();


var app = builder.Build();

app.UseCors("AllowFrontend");

if(app.Environment.IsDevelopment())
{
    app.ApplyMigrations();
}

app.UseAuthorization();

app.MapControllers();

// Configure the HTTP request pipeline.

app.Run();
