using Auth.Api.Domain.Models;
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
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            var patientRoleId = "430f06bf-f5cd-4d94-87f5-cb9575698d74";
            var doctorRoleId = "d251e4e9-a928-48da-aa5d-720eaa10789c";

            var roles = new List<IdentityRole>
            {
                new IdentityRole
                {
                    Id = patientRoleId,
                    ConcurrencyStamp = patientRoleId,
                    Name = "Patient",
                    NormalizedName = "PATIENT".ToUpper()
                },
                new IdentityRole
                {
                    Id = doctorRoleId,
                    ConcurrencyStamp = doctorRoleId,
                    Name = "Doctor",
                    NormalizedName = "DOCTOR".ToUpper()
                }
            };

            builder.Entity<IdentityRole>().HasData(roles);

        }
    }
}
