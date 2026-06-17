using AccessRequests.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AccessRequests.Api.Extensions
{
    public static class MigrationExtension
    {
        public static void ApplyMigrations(this IApplicationBuilder app)
        {
            using IServiceScope scope = app.ApplicationServices.CreateScope();

            var db = scope.ServiceProvider.GetRequiredService<AccessRequestDbContext>();

            if (!db.Database.CanConnect())
            {
                db.Database.Migrate();
            }
            else
            {
                Console.WriteLine("Database already exists and is reachable. Skipping migration.");
            }
        }
    }
}
