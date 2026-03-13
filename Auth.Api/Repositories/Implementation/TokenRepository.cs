using Auth.Api.Domain.Models;
using Auth.Api.Repositories.Interface;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Auth.Api.Repositories.Implementation
{
    public class TokenRepository : ITokenRepository
    {
        private readonly IConfiguration configuration;

        public TokenRepository(IConfiguration configuration)
        {
            this.configuration = configuration;
        }

        public string CreateToken(ApplicationUser user, List<string> roles)
        {
            var claims = new List<Claim>
            {
                new Claim("email", user.Email!),
                new Claim("identityId", user.Id),
                new Claim("userId", user.User?.Id.ToString() ?? string.Empty),
                new Claim("username", user.UserName ?? string.Empty),
                new Claim("walletAddress", user.WalletAddress),
                new Claim("firstName", user.User?.FirstName ?? string.Empty),
                new Claim("lastName", user.User?.LastName ?? string.Empty)
            };

            foreach (var role in roles)
            {
                claims.Add(new Claim("role", role));
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                configuration["Jwt:Issuer"],
                configuration["Jwt:Audience"],
                claims,
                expires: DateTime.Now.AddYears(1),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
