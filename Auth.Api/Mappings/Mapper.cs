using Auth.Api.Domain.Models;
using Auth.Api.Models.Domain;
using Auth.Api.Models.DTOs;
using Auth.Api.Models.Messages;

namespace Auth.Api.Mappings
{
    public static class Mapper
    {
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
           
        public static LoginResponseDto ToLoginResponseDto(ApplicationUser user) => new()
        {
            Token = string.Empty,
        };

        public static UserCreatedResponseEvent ToUserCreatedResponseEvent(User user) => new()
        {
            Id = user.Id,
            IdentityId = user.IdentityId,
            FirstName = user.FirstName,
            LastName = user.LastName,
        };

        public static User ToUser(UserCreatedResponseEvent evt) => new()
        {
            Id = evt.Id,
            IdentityId = evt.IdentityId,
            FirstName = evt.FirstName,
            LastName = evt.LastName,
        };

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