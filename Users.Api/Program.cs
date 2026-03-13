using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RabbitMQ.Client;
using System.Text;
using Users.Api.Data;
using Users.Api.Extensions;
using Users.Api.Infrastructure.RabbitMQ.Implementation;
using Users.Api.Infrastructure.RabbitMQ.Interface;
using Users.Api.Mappings;
using Users.Api.Repositories.Implementation;
using Users.Api.Repositories.Interface;
using Users.Api.Services.Implementation;
using Users.Api.Services.Interface;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<UsersDbContext>(options =>
options.UseSqlServer(builder.Configuration.GetConnectionString("UsersConnectionString")));

builder.Services.AddControllers();

builder.Services.AddScoped<IDoctorsRepository, DoctorsRepository>();
builder.Services.AddScoped<IPatientsRepository, PatientsRepository>();
builder.Services.AddScoped<IUsersService, UsersService>();

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

builder.Services.AddSingleton(typeof(IGenericRabbitMQService<>), typeof(GenericRabbitMQService<>));
builder.Services.AddSingleton(typeof(IGenericRabbitMQConsumer<>), typeof(GenericRabbitMQConsumer<>));

builder.Services.AddHostedService<IdentityCreatedConsumerWorker>();

builder.Services.AddAutoMapper(typeof(AutoMapperProfiles));

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