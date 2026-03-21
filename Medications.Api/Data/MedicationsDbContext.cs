using Medications.Api.Models.Domain;
using Microsoft.EntityFrameworkCore;

namespace Medications.Api.Data
{
    public class MedicationsDbContext : DbContext
    {
        public MedicationsDbContext(DbContextOptions<MedicationsDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Medication> Medications { get; set; }
        public DbSet<MedicationEnvelope> MedicationEnvelopes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Medication>(entity =>
            {
                entity.HasOne(m => m.Patient)
                    .WithMany()
                    .HasForeignKey(m => m.PatientId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(m => m.CreatedByDoctor)
                    .WithMany()
                    .HasForeignKey(m => m.CreatedByDoctorId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(m => m.Envelopes)
                    .WithOne(e => e.Medication)
                    .HasForeignKey(e => e.MedicationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<MedicationEnvelope>(entity =>
            {
                entity.HasIndex(e => new { e.MedicationId, e.UserId }).IsUnique();
            });
        }
    }
}