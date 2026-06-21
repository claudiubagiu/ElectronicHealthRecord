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
        public DbSet<Envelope> Envelopes { get; set; }
        public DbSet<DocumentKey> DocumentKeys { get; set; }

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

            modelBuilder.Entity<Envelope>(entity =>
            {
                entity.HasOne(e => e.Patient)
                    .WithMany()
                    .HasForeignKey(e => e.PatientId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.PatientId, e.UserId }).IsUnique();
            });

            modelBuilder.Entity<DocumentKey>(entity =>
            {
                entity.HasOne(d => d.Patient)
                    .WithMany()
                    .HasForeignKey(d => d.PatientId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(d => d.IpfsCid).IsUnique();
            });
        }
    }
}