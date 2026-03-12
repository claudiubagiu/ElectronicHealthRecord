using Diagnostics.Api.Models.Domain;
using Microsoft.EntityFrameworkCore;

namespace Diagnostics.Api.Data
{
    public class DiagnosticsDbContext : DbContext
    {
        public DiagnosticsDbContext(DbContextOptions<DiagnosticsDbContext> options) : base(options)
        {
        }

        public DbSet<Diagnostic> Diagnostics { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Diagnostic>()
                .HasOne(d => d.Patient)
                .WithMany(u => u.DiagnosticsAsPatient)
                .HasForeignKey(d => d.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Diagnostic>()
                .HasOne(d => d.Doctor)
                .WithMany(u => u.DiagnosticsAsDoctor)
                .HasForeignKey(d => d.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
