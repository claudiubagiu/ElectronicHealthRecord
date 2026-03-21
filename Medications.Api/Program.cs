using Medications.Api.Data;
using Medications.Api.Extensions;
using Medications.Api.Infrastructure.RabbitMQ.Implementation;
using Medications.Api.Infrastructure.RabbitMQ.Interface;
using Medications.Api.Mappings;
using Medications.Api.Repositories.Implementation;
using Medications.Api.Repositories.Interface;
using Medications.Api.Services.Implementation;
using Medications.Api.Services.Interface;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RabbitMQ.Client;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<MedicationsDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("MedicationsConnectionString")));

builder.Services.AddAutoMapper(typeof(AutoMapperProfiles));

builder.Services.AddScoped<IUsersRepository, UsersRepository>();
builder.Services.AddScoped<IMedicationRepository, MedicationRepository>();
builder.Services.AddScoped<IMedicationService, MedicationService>();

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

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
        };
    });

var app = builder.Build();

app.UseCors("AllowFrontend");

if (app.Environment.IsDevelopment())
{
    app.ApplyMigrations();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();