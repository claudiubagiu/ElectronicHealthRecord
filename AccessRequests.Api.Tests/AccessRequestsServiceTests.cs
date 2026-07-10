using AccessRequests.Api.Models.Domain;
using AccessRequests.Api.Models.DTOs;
using AccessRequests.Api.Repositories.Interface;
using AccessRequests.Api.Services.Implementation;
using Moq;
using Xunit;

namespace AccessRequests.Api.Tests
{
    public class AccessRequestServiceTests
    {
        private readonly Mock<IAccessRequestRepository> _requestRepoMock;
        private readonly Mock<IAccessRequestHistoryRepository> _historyRepoMock;
        private readonly Mock<IUsersRepository> _usersRepoMock;
        private readonly Mock<IEnvelopeRepository> _envelopeRepoMock;
        private readonly AccessRequestService _service;

        public AccessRequestServiceTests()
        {
            _requestRepoMock = new Mock<IAccessRequestRepository>();
            _historyRepoMock = new Mock<IAccessRequestHistoryRepository>();
            _usersRepoMock = new Mock<IUsersRepository>();
            _envelopeRepoMock = new Mock<IEnvelopeRepository>();

            _service = new AccessRequestService(
                _requestRepoMock.Object,
                _historyRepoMock.Object,
                _usersRepoMock.Object,
                _envelopeRepoMock.Object
            );
        }

        private static AccessRequest MakeRequest(
            Guid? id = null,
            Guid? patientId = null,
            Guid? doctorId = null,
            AccessRequestStatus status = AccessRequestStatus.Pending) => new()
            {
                Id = id ?? Guid.NewGuid(),
                PatientId = patientId ?? Guid.NewGuid(),
                DoctorId = doctorId ?? Guid.NewGuid(),
                Status = status,
                CreatedAt = DateTime.UtcNow
            };


        [Fact]
        public async Task ApproveAsync_ShouldFail_WhenRequestNotFound()
        {
            _requestRepoMock
                .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
                .ReturnsAsync((AccessRequest?)null);

            var result = await _service.ApproveAsync(
                Guid.NewGuid(), Guid.NewGuid(), new CreateEnvelopeDto { EncryptedAesKey = "key" });

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("not found"));
        }

        [Fact]
        public async Task ApproveAsync_ShouldFail_WhenPatientIdMismatch()
        {
            var request = MakeRequest(patientId: Guid.NewGuid());

            _requestRepoMock
                .Setup(r => r.GetByIdAsync(request.Id))
                .ReturnsAsync(request);

            var result = await _service.ApproveAsync(
                request.Id, Guid.NewGuid(), new CreateEnvelopeDto { EncryptedAesKey = "key" });

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("Forbidden"));
        }

        [Fact]
        public async Task ApproveAsync_ShouldFail_WhenRequestIsNotPending()
        {
            var patientId = Guid.NewGuid();
            var request = MakeRequest(patientId: patientId, status: AccessRequestStatus.Approved);

            _requestRepoMock
                .Setup(r => r.GetByIdAsync(request.Id))
                .ReturnsAsync(request);

            var result = await _service.ApproveAsync(
                request.Id, patientId, new CreateEnvelopeDto { EncryptedAesKey = "key" });

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("no longer pending"));
        }

        [Fact]
        public async Task ApproveAsync_ShouldFail_WhenEnvelopeKeyIsMissing()
        {
            var patientId = Guid.NewGuid();
            var request = MakeRequest(patientId: patientId, status: AccessRequestStatus.Pending);

            _requestRepoMock
                .Setup(r => r.GetByIdAsync(request.Id))
                .ReturnsAsync(request);

            var result = await _service.ApproveAsync(
                request.Id, patientId, new CreateEnvelopeDto { EncryptedAesKey = "" });

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("encrypted AES key"));
        }

        [Fact]
        public async Task RejectAsync_ShouldFail_WhenRequestNotFound()
        {
            _requestRepoMock
                .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
                .ReturnsAsync((AccessRequest?)null);

            var result = await _service.RejectAsync(Guid.NewGuid(), Guid.NewGuid());

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("not found"));
        }

        [Fact]
        public async Task RejectAsync_ShouldFail_WhenPatientIdMismatch()
        {
            var request = MakeRequest(patientId: Guid.NewGuid());

            _requestRepoMock
                .Setup(r => r.GetByIdAsync(request.Id))
                .ReturnsAsync(request);

            var result = await _service.RejectAsync(request.Id, Guid.NewGuid());

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("Forbidden"));
        }

        [Fact]
        public async Task RevokeAsync_ShouldFail_WhenRequestNotFound()
        {
            _requestRepoMock
                .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
                .ReturnsAsync((AccessRequest?)null);

            var result = await _service.RevokeAsync(Guid.NewGuid(), Guid.NewGuid());

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("not found"));
        }

        [Fact]
        public async Task RevokeAsync_ShouldFail_WhenRequestIsNotApproved()
        {
            var patientId = Guid.NewGuid();
            var request = MakeRequest(patientId: patientId, status: AccessRequestStatus.Pending);

            _requestRepoMock
                .Setup(r => r.GetByIdAsync(request.Id))
                .ReturnsAsync(request);

            var result = await _service.RevokeAsync(request.Id, patientId);

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("Only approved requests can be revoked"));
        }

        [Fact]
        public async Task RevokeAsync_ShouldFail_WhenPatientIdMismatch()
        {
            var request = MakeRequest(patientId: Guid.NewGuid(), status: AccessRequestStatus.Approved);

            _requestRepoMock
                .Setup(r => r.GetByIdAsync(request.Id))
                .ReturnsAsync(request);

            var result = await _service.RevokeAsync(request.Id, Guid.NewGuid());

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("Forbidden"));
        }

        [Fact]
        public async Task CreateAsync_ShouldFail_WhenDoctorNotFound()
        {
            _usersRepoMock
                .Setup(r => r.ExistsAsync(It.IsAny<Guid>()))
                .ReturnsAsync(false);

            var result = await _service.CreateAsync(
                Guid.NewGuid(), new CreateAccessRequestDto { PatientId = Guid.NewGuid() });

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("Doctor not found"));
        }

        [Fact]
        public async Task CreateAsync_ShouldFail_WhenPendingRequestAlreadyExists()
        {
            var doctorId = Guid.NewGuid();
            var patientId = Guid.NewGuid();
            var existing = MakeRequest(patientId: patientId, doctorId: doctorId);

            _usersRepoMock
                .Setup(r => r.ExistsAsync(doctorId))
                .ReturnsAsync(true);
            _usersRepoMock
                .Setup(r => r.ExistsAsync(patientId))
                .ReturnsAsync(true);
            _requestRepoMock
                .Setup(r => r.GetPendingAsync(doctorId, patientId))
                .ReturnsAsync(existing);

            var result = await _service.CreateAsync(
                doctorId, new CreateAccessRequestDto { PatientId = patientId });

            Assert.True(result.IsFailed);
            Assert.Contains(result.Errors, e => e.Message.Contains("already pending"));
        }
    }
}