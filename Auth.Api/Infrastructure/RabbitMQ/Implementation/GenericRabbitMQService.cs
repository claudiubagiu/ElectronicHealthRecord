using Auth.Api.Infrastructure.RabbitMQ.Interface;
using Newtonsoft.Json;
using RabbitMQ.Client;
using System.Text;

namespace Auth.Api.Infrastructure.RabbitMQ.Implementation
{
    public class GenericRabbitMQService<T> : IGenericRabbitMQService<T> where T : class
    {
        private readonly IConnection _connection;

        public GenericRabbitMQService(IConnection connection)
        {
            _connection = connection;
        }

        public async Task PublishAsync(T item, string queueName)
        {
            await using var channel = await _connection.CreateChannelAsync();

            await channel.QueueDeclareAsync(
                queue: queueName,
                durable: true,
                exclusive: false,
                autoDelete: false);

            var json = JsonConvert.SerializeObject(item);
            var body = Encoding.UTF8.GetBytes(json);

            var properties = new BasicProperties();
            properties.Persistent = true;

            await channel.BasicPublishAsync(exchange: string.Empty,
                                            routingKey: queueName,
                                            mandatory: false,
                                            basicProperties: properties,
                                            body: new ReadOnlyMemory<byte>(body));
        }
    }
}
