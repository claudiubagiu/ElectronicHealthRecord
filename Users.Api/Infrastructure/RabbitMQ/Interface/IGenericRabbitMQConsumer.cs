namespace Users.Api.Infrastructure.RabbitMQ.Interface
{
    public interface IGenericRabbitMQConsumer<T> where T : class
    {
        Task StartConsumingAsync(
            string hostName,
            string queueName,
            Func<T, Task> handleMessage);
    }
}
