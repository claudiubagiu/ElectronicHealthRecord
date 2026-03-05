using Auth.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Auth.Api.Extensions
{
    public static class MigrationExtension
    {
        public static void ApplyMigrations(this IApplicationBuilder app)
        {
            using IServiceScope scope = app.ApplicationServices.CreateScope();

            var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();

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
