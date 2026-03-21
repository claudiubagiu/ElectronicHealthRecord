using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Medications.Api.Migrations
{
    /// <inheritdoc />
    public partial class MedicationsMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    WalletAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Medications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncryptedData = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Iv = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedByDoctorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Medications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Medications_Users_CreatedByDoctorId",
                        column: x => x.CreatedByDoctorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Medications_Users_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MedicationEnvelopes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MedicationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncryptedAesKey = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicationEnvelopes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MedicationEnvelopes_Medications_MedicationId",
                        column: x => x.MedicationId,
                        principalTable: "Medications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MedicationEnvelopes_MedicationId_UserId",
                table: "MedicationEnvelopes",
                columns: new[] { "MedicationId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Medications_CreatedByDoctorId",
                table: "Medications",
                column: "CreatedByDoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_Medications_PatientId",
                table: "Medications",
                column: "PatientId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MedicationEnvelopes");

            migrationBuilder.DropTable(
                name: "Medications");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
