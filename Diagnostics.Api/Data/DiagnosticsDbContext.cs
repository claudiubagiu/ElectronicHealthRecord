using Diagnostics.Api.Models.Domain;
using Microsoft.EntityFrameworkCore;

namespace Diagnostics.Api.Data
{
    public class DiagnosticsDbContext : DbContext
    {
        public DiagnosticsDbContext(DbContextOptions<DiagnosticsDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<DiagnosticsAccessRequest> AccessRequests { get; set; }
        public DbSet<AccessRequestHistory> AccessRequestHistories { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<DiagnosticsAccessRequest>()
                .HasOne(r => r.Doctor)
                .WithMany()
                .HasForeignKey(r => r.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<DiagnosticsAccessRequest>()
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
