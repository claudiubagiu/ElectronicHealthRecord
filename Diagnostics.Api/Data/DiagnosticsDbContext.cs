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
        public DbSet<DiagnosticDraft> DiagnosticDrafts { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<DiagnosticDraft>(entity =>
            {
                entity.HasOne(d => d.Patient)
                    .WithMany()
                    .HasForeignKey(d => d.PatientId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}