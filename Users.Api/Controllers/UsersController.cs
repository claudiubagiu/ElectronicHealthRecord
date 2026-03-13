using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Users.Api.Models.DTOs;
using Users.Api.Services.Implementation;
using Users.Api.Services.Interface;

namespace Users.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly IUsersService usersService;

        public UsersController(IUsersService usersService)
        {
            this.usersService = usersService;
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchPatients([FromQuery] string search)
        {
            var patients = await usersService.GetPatiensByFullName(search);
            return Ok(patients);
        }
    }
}