using Diagnostics.Api.Models.Domain;
using Diagnostics.Api.Models.DTOs;
using Diagnostics.Api.Repositories.Interface;
using Diagnostics.Api.Services.Implementation;
using Moq;
using Xunit;

namespace Diagnostics.Api.Tests
{
    public class DiagnosticDraftServiceTests
    {
        private readonly Mock<IDiagnosticDraftRepository> _draftRepoMock;
        private readonly Mock<IUsersRepository> _usersRepoMock;
        private readonly DiagnosticDraftService _service;

        public DiagnosticDraftServiceTests()
        {
            _draftRepoMock = new Mock<IDiagnosticDraftRepository>();
            _usersRepoMock = new Mock<IUsersRepository>();

            _service = new DiagnosticDraftService(
                _draftRepoMock.Object,
                _usersRepoMock.Object
            );
        }

        // ── Helper ────────────────────────────────────────────────────────────

        private static DiagnosticDraft MakeDraft(
            Guid? id = null,
            Guid? patientId = null,
            string status = "Draft") => new()
            {
                Id = id ?? Guid.NewGuid(),
                Status = status,
                PatientId = patientId ?? Guid.NewGuid(),
                PatientWalletAddress = "0xWallet",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                EncryptedData = "encryptedData",
                Iv = "iv",
                EncryptedDocumentKey = "docKey"
            };

        private static CreateDiagnosticDraftDto MakeCreateDto(Guid? patientId = null) => new()
        {
            PatientId = patientId ?? Guid.NewGuid(),
            PatientWalletAddress = "0xWallet",
            EncryptedData = "encryptedData",
            Iv = "iv",
            EncryptedDocumentKey = "docKey",
            LinkedMedicalRecordIds = "[]"
        };

        // ── CreateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task CreateAsync_ShouldFail_WhenPatientNotFound()
        {
            _usersRepoMock
                .Setup(r => r.ExistsAsync(It.IsAny<Guid>()))
                .ReturnsAsync(false);

            var result = await _service.CreateAsync(Guid.NewGuid(), MakeCreateDto());

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("Patient not found"));
        }

        [Fact]
        public async Task CreateAsync_ShouldFail_WhenActiveDraftAlreadyExists()
        {
            var patientId = Guid.NewGuid();
            var existingDraft = MakeDraft(patientId: patientId);

            _usersRepoMock
                .Setup(r => r.ExistsAsync(patientId))
                .ReturnsAsync(true);

            _draftRepoMock
                .Setup(r => r.GetActiveByPatientIdAsync(patientId))
                .ReturnsAsync(existingDraft);

            var result = await _service.CreateAsync(Guid.NewGuid(), MakeCreateDto(patientId));

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("active draft already exists"));
        }

        [Fact]
        public async Task CreateAsync_ShouldSucceed_WhenPatientExistsAndNoDraftExists()
        {
            var patientId = Guid.NewGuid();
            var draft = MakeDraft(patientId: patientId);

            _usersRepoMock
                .Setup(r => r.ExistsAsync(patientId))
                .ReturnsAsync(true);

            _draftRepoMock
                .Setup(r => r.GetActiveByPatientIdAsync(patientId))
                .ReturnsAsync((DiagnosticDraft?)null);

            _draftRepoMock
                .Setup(r => r.CreateAsync(It.IsAny<DiagnosticDraft>()))
                .ReturnsAsync(draft);

            var result = await _service.CreateAsync(Guid.NewGuid(), MakeCreateDto(patientId));

            Assert.True(result.IsSuccess);
            Assert.Equal(patientId, result.Value.PatientId);
        }

        // ── GetActiveByPatientIdAsync ─────────────────────────────────────────

        [Fact]
        public async Task GetActiveByPatientIdAsync_ShouldFail_WhenPatientNotFound()
        {
            _usersRepoMock
                .Setup(r => r.ExistsAsync(It.IsAny<Guid>()))
                .ReturnsAsync(false);

            var result = await _service.GetActiveByPatientIdAsync(Guid.NewGuid(), Guid.NewGuid());

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("Patient not found"));
        }

        [Fact]
        public async Task GetActiveByPatientIdAsync_ShouldFail_WhenNoDraftExists()
        {
            var patientId = Guid.NewGuid();

            _usersRepoMock
                .Setup(r => r.ExistsAsync(patientId))
                .ReturnsAsync(true);

            _draftRepoMock
                .Setup(r => r.GetActiveByPatientIdAsync(patientId))
                .ReturnsAsync((DiagnosticDraft?)null);

            var result = await _service.GetActiveByPatientIdAsync(patientId, Guid.NewGuid());

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("No active draft found"));
        }

        [Fact]
        public async Task GetActiveByPatientIdAsync_ShouldSucceed_WhenDraftExists()
        {
            var patientId = Guid.NewGuid();
            var draft = MakeDraft(patientId: patientId);

            _usersRepoMock
                .Setup(r => r.ExistsAsync(patientId))
                .ReturnsAsync(true);

            _draftRepoMock
                .Setup(r => r.GetActiveByPatientIdAsync(patientId))
                .ReturnsAsync(draft);

            var result = await _service.GetActiveByPatientIdAsync(patientId, Guid.NewGuid());

            Assert.True(result.IsSuccess);
            Assert.Equal(patientId, result.Value.PatientId);
        }

        // ── UpdateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task UpdateAsync_ShouldFail_WhenDraftNotFound()
        {
            _draftRepoMock
                .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
                .ReturnsAsync((DiagnosticDraft?)null);

            var result = await _service.UpdateAsync(Guid.NewGuid(), Guid.NewGuid(), new UpdateDiagnosticDraftDto
            {
                EncryptedData = "data",
                Iv = "iv",
                EncryptedDocumentKey = "key",
                LinkedMedicalRecordIds = "[]"
            });

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("Draft not found"));
        }

        // ── DeleteAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task DeleteAsync_ShouldFail_WhenDraftNotFound()
        {
            _draftRepoMock
                .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
                .ReturnsAsync((DiagnosticDraft?)null);

            var result = await _service.DeleteAsync(Guid.NewGuid(), Guid.NewGuid());

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("Draft not found"));
        }

        [Fact]
        public async Task DeleteAsync_ShouldFail_WhenRepositoryDeleteFails()
        {
            var draft = MakeDraft();

            _draftRepoMock
                .Setup(r => r.GetByIdAsync(draft.Id))
                .ReturnsAsync(draft);

            _draftRepoMock
                .Setup(r => r.DeleteAsync(draft.Id))
                .ReturnsAsync(false);

            var result = await _service.DeleteAsync(draft.Id, Guid.NewGuid());

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("Failed to delete"));
        }

        [Fact]
        public async Task DeleteAsync_ShouldSucceed_WhenDraftExists()
        {
            var draft = MakeDraft();

            _draftRepoMock
                .Setup(r => r.GetByIdAsync(draft.Id))
                .ReturnsAsync(draft);

            _draftRepoMock
                .Setup(r => r.DeleteAsync(draft.Id))
                .ReturnsAsync(true);

            var result = await _service.DeleteAsync(draft.Id, Guid.NewGuid());

            Assert.True(result.IsSuccess);
        }
    }
}