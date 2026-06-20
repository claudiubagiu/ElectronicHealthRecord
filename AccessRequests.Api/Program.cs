using AccessRequests.Api.BackgroundJobs;
using AccessRequests.Api.Data;
using AccessRequests.Api.Extensions;
using AccessRequests.Api.Infrastructure.RabbitMQ.Implementation;
using AccessRequests.Api.Infrastructure.RabbitMQ.Interface;
using AccessRequests.Api.Mappings;
using AccessRequests.Api.Repositories.Implementation;
using AccessRequests.Api.Repositories.Interface;
using AccessRequests.Api.Services.Implementation;
using AccessRequests.Api.Services.Interface;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RabbitMQ.Client;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<AccessRequestDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AccessRequestConnectionString")));

builder.Services.AddAutoMapper(typeof(AutoMapperProfiles));

builder.Services.AddScoped<IUsersRepository, UsersRepository>();
builder.Services.AddScoped<IAccessRequestRepository, AccessRequestRepository>();
builder.Services.AddScoped<IAccessRequestHistoryRepository, AccessRequestHistoryRepository>();
builder.Services.AddScoped<IAccessRequestService, AccessRequestService>();
builder.Services.AddScoped<IEnvelopeRepository, EnvelopeRepository>();

builder.Services.AddHttpClient("MedicationsApi", client =>
{
    client.BaseAddress = new Uri("http://medications.api:8080/");
});

builder.Services.AddHostedService<AccessExpirationWorker>();

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