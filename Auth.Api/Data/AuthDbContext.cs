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
            var medicalAssistantRoleId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
            var administratorRoleId = "b3c4d5e6-f7a8-9012-bcde-f01234567891";

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
                },
                new IdentityRole
                {
                    Id = medicalAssistantRoleId,
                    ConcurrencyStamp = medicalAssistantRoleId,
                    Name = "MedicalAssistant",
                    NormalizedName = "MEDICALASSISTANT"
                },
                new IdentityRole
                {
                    Id = administratorRoleId,
                    ConcurrencyStamp = administratorRoleId,
                    Name = "Administrator",
                    NormalizedName = "ADMINISTRATOR"
                }
            };

            builder.Entity<IdentityRole>().HasData(roles);

            // Admin user seed 
            //
            // Raul Adrian — wallet 0x2e0aCDEDA1A679941B39695d290972c74aB87dd0
            //
            // IsApproved = true because the admin is seeded directly and does
            // not go through the normal registration flow.

            var adminUserId = "c1d2e3f4-a5b6-7890-cdef-012345678901";
            var adminWallet = "0x2e0acdeda1a679941b39695d290972c74ab87dd0";

            var adminUser = new ApplicationUser
            {
                Id = adminUserId,
                UserName = "raul.adrian",
                NormalizedUserName = "RAUL.ADRIAN",
                Email = "raul.adrian@medchain.admin",
                NormalizedEmail = "RAUL.ADRIAN@MEDCHAIN.ADMIN",
                EmailConfirmed = true,
                PhoneNumber = null,
                PhoneNumberConfirmed = false,
                TwoFactorEnabled = false,
                LockoutEnabled = false,
                AccessFailedCount = 0,
                SecurityStamp = "ADMIN_SECURITY_STAMP_RAUL_ADRIAN",
                ConcurrencyStamp = "ADMIN_CONCURRENCY_STAMP_RAUL_ADRIAN",
                WalletAddress = adminWallet,
                Challenge = "INITIAL_PLACEHOLDER_CHALLENGE",
                EccPublicKey = "0x045b30b66a15f636fa41b17afb8c585a70500ce48622e12fc26756e26537112eb4486e0b4263db46ff8c6ea62d39f39fdd6562fe4a115bdb41a2a08a524f1d1d48",
                IsApproved = true,
            };

            builder.Entity<ApplicationUser>().HasData(adminUser);

            builder.Entity<IdentityUserRole<string>>().HasData(new IdentityUserRole<string>
            {
                UserId = adminUserId,
                RoleId = administratorRoleId
            });

            builder.Entity<User>()
                .HasOne(u => u.ApplicationUser)
                .WithOne(a => a.User)
                .HasForeignKey<User>(u => u.IdentityId)
                .IsRequired(false);
        }
    }
}