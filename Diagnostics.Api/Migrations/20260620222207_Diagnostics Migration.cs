using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Diagnostics.Api.Migrations
{
    /// <inheritdoc />
    public partial class DiagnosticsMigration : Migration
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
                    Role = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PublicKey = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EncryptedAesKey = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DiagnosticDrafts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientWalletAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedByAssistantId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CompletedByDoctorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EncryptedData = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Iv = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LinkedMedicalRecordIds = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiagnosticDrafts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DiagnosticDrafts_Users_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DiagnosticDrafts_PatientId",
                table: "DiagnosticDrafts",
                column: "PatientId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DiagnosticDrafts");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
