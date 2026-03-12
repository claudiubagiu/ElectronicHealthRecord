namespace Users.Api.Infrastructure.RabbitMQ.Interface
{
    public interface IGenericRabbitMQService<T> where T : class
    {
        public Task PublishAsync(T item, string queueName);
    }
}
