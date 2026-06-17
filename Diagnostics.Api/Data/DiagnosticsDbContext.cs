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
        public DbSet<DiagnosticDraftEnvelope> DiagnosticDraftEnvelopes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<DiagnosticDraft>(entity =>
            {
                entity.HasOne(d => d.Patient)
                    .WithMany()
                    .HasForeignKey(d => d.PatientId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(d => d.Envelopes)
                    .WithOne(e => e.DiagnosticDraft)
                    .HasForeignKey(e => e.DiagnosticDraftId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<DiagnosticDraftEnvelope>(entity =>
            {
                entity.HasIndex(e => new { e.DiagnosticDraftId, e.UserId }).IsUnique();
            });
        }
    }
}