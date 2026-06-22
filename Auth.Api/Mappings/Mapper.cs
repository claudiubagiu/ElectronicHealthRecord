using Auth.Api.Domain.Models;
using Auth.Api.Models.Domain;
using Auth.Api.Models.DTOs;
using Auth.Api.Models.Messages;

namespace Auth.Api.Mappings
{
    /// <summary>
    /// Central manual mapping for Auth.Api.
    /// Covers both the former AutoMapper-based mappings and the mappings
    /// previously written by hand inline in controllers/services,
    /// consolidated here for consistency.
    /// </summary>
    public static class Mapper
    {
        /// <summary>
        /// RegisterRequestDto → ApplicationUser.
        /// EccSignature is intentionally NOT mapped (verification-only, never persisted).
        /// Challenge/IsApproved/EncryptedAesKey are finalized by AuthService.Register
        /// right after this call, same as with the old AutoMapper profile.
        /// </summary>
        public static ApplicationUser ToApplicationUser(RegisterRequestDto dto) => new()
        {
            UserName = dto.UserName,
            Email = dto.Email,
            PhoneNumber = dto.PhoneNumber,
            WalletAddress = dto.WalletAddress,
            Challenge = string.Empty,
            EncryptedAesKey = dto.EncryptedAesKey,
            EccPublicKey = dto.EccPublicKey,
        };
           
        /// <summary>
        /// ApplicationUser → LoginResponseDto.
        /// Token doesn't exist on ApplicationUser; AuthService.Register sets the
        /// real token on the result right after this call.
        /// </summary>
        public static LoginResponseDto ToLoginResponseDto(ApplicationUser user) => new()
        {
            Token = string.Empty,
        };

        /// <summary>
        /// User → UserCreatedResponseEvent.
        /// </summary>
        public static UserCreatedResponseEvent ToUserCreatedResponseEvent(User user) => new()
        {
            Id = user.Id,
            IdentityId = user.IdentityId,
            FirstName = user.FirstName,
            LastName = user.LastName,
        };

        /// <summary>
        /// UserCreatedResponseEvent → User (old ReverseMap direction).
        /// Used by UserCreatedConsumerWorker when consuming events from the queue.
        /// </summary>
        public static User ToUser(UserCreatedResponseEvent evt) => new()
        {
            Id = evt.Id,
            IdentityId = evt.IdentityId,
            FirstName = evt.FirstName,
            LastName = evt.LastName,
        };

        /// <summary>
        /// ApplicationUser + roles → PendingMedicDto.
        /// Used by AdminController for the pending/approved medics listing
        /// and after approve/revoke actions.
        /// </summary>
        public static PendingMedicDto ToPendingMedicDto(ApplicationUser user, IList<string> roles) => new()
        {
            Id = user.Id,
            UserName = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            WalletAddress = user.WalletAddress,
            FirstName = user.User?.FirstName ?? string.Empty,
            LastName = user.User?.LastName ?? string.Empty,
            Roles = roles.ToList(),
            IsApproved = user.IsApproved,
        };
    }
}