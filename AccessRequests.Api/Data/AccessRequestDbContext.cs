using AccessRequests.Api.Models.Domain;
using Microsoft.EntityFrameworkCore;

namespace AccessRequests.Api.Data
{
    public class AccessRequestDbContext : DbContext
    {
        public AccessRequestDbContext(DbContextOptions<AccessRequestDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Models.Domain.AccessRequest> AccessRequests { get; set; }
        public DbSet<AccessRequestHistory> AccessRequestHistories { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Models.Domain.AccessRequest>()
                .HasOne(r => r.Doctor)
                .WithMany()
                .HasForeignKey(r => r.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Models.Domain.AccessRequest>()
                .HasOne(r => r.Patient)
                .WithMany()
                .HasForeignKey(r => r.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<AccessRequestHistory>()
                .HasOne(h => h.AccessRequest)
                .WithMany()
                .HasForeignKey(h => h.AccessRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
