using Diagnostics.Api.Infrastructure.RabbitMQ.Interface;
using Newtonsoft.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;

namespace Diagnostics.Api.Infrastructure.RabbitMQ.Implementation
{
    public class GenericRabbitMQConsumer<T> : IGenericRabbitMQConsumer<T> where T : class
    {
        private IConnection? _connection;
        private IChannel? _channel;

        public GenericRabbitMQConsumer(IConnection connection)
        {
            _connection = connection;
        }

        public async Task StartConsumingAsync(
            string hostName,
            string queueName,
            Func<T, Task> handleMessage)
        {
            var factory = new ConnectionFactory()
            {
                HostName = hostName
            };

            _connection = await factory.CreateConnectionAsync();
            _channel = await _connection.CreateChannelAsync();

            await _channel.QueueDeclareAsync(
                queue: queueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            var consumer = new AsyncEventingBasicConsumer(_channel);

            consumer.ReceivedAsync += async (sender, eventArgs) =>
            {
                try
                {
                    var body = eventArgs.Body.ToArray();
                    var json = Encoding.UTF8.GetString(body);

                    var item = JsonConvert.DeserializeObject<T>(json);

                    if (item != null)
                    {
                        await handleMessage(item);
                    }

                    await _channel.BasicAckAsync(
                        deliveryTag: eventArgs.DeliveryTag,
                        multiple: false);
                }
                catch (Exception ex)
                {
                    await _channel.BasicNackAsync(
                        deliveryTag: eventArgs.DeliveryTag,
                        multiple: false,
                        requeue: false);
                }
            };

            await _channel.BasicConsumeAsync(
                queue: queueName,
                autoAck: false,
                consumer: consumer);
        }
    }
}
