using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Users.Api.Models.Domain;

namespace Users.Api.Data
{
    public class UsersDbContext : DbContext
    {
        public UsersDbContext(DbContextOptions<UsersDbContext> options) : base(options)
        {
        }

        public DbSet<Doctor> Doctors { get; set; }
        public DbSet<Patient> Patients { get; set; }
        public DbSet<LaboratoryTechnician> LaboratoryTechnicians { get; set; }
        public DbSet<Pharmacist> Pharmacists { get; set; }
        public DbSet<MedicalAssistant> MedicalAssistants { get; set; } 

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
        }
    }
}
