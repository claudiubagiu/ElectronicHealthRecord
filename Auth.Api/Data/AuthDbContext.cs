using Auth.Api.Domain.Models;
using Auth.Api.Models.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Auth.Api.Data
{
    public class AuthDbContext : IdentityDbContext<ApplicationUser>
    {
        public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            var patientRoleId = "430f06bf-f5cd-4d94-87f5-cb9575698d74";
            var doctorRoleId = "d251e4e9-a928-48da-aa5d-720eaa10789c";
            var labTechnicianRoleId = "e5c9a8b9-3f1d-4e5c-9c9b-2a7a5e6c8f1b";
            var pharmacistRoleId = "f7a3b2c1-8d4e-4f6a-9b0c-1e2d3f4a5b6c";

            var roles = new List<IdentityRole>
            {
                new IdentityRole
                {
                    Id = patientRoleId,
                    ConcurrencyStamp = patientRoleId,
                    Name = "Patient",
                    NormalizedName = "PATIENT"
                },
                new IdentityRole
                {
                    Id = doctorRoleId,
                    ConcurrencyStamp = doctorRoleId,
                    Name = "Doctor",
                    NormalizedName = "DOCTOR"
                },
                new IdentityRole
                {
                    Id = labTechnicianRoleId,
                    ConcurrencyStamp = labTechnicianRoleId,
                    Name = "LaboratoryTechnician",
                    NormalizedName = "LABORATORYTECHNICIAN"
                },
                new IdentityRole
                {
                    Id = pharmacistRoleId,
                    ConcurrencyStamp = pharmacistRoleId,
                    Name = "Pharmacist",
                    NormalizedName = "PHARMACIST"
                }
            };

            builder.Entity<IdentityRole>().HasData(roles);

            builder.Entity<User>()
                .HasOne(u => u.ApplicationUser)
                .WithOne(a => a.User)
                .HasForeignKey<User>(u => u.IdentityId)
                .IsRequired(false);
        }
    }
}