using MedicalData.Api.Models.Domain;
using Microsoft.EntityFrameworkCore;

namespace MedicalData.Api.Data
{
    public class MedicalDataDbContext : DbContext
    {
        public MedicalDataDbContext(DbContextOptions<MedicalDataDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<MedicalRecord> MedicalRecords { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<MedicalRecord>(entity =>
            {
                entity.HasOne(m => m.Patient)
                    .WithMany()
                    .HasForeignKey(m => m.PatientId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(m => m.CreatedByDoctor)
                    .WithMany()
                    .HasForeignKey(m => m.CreatedByDoctorId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}