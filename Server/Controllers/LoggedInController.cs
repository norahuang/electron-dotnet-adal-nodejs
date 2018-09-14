using Microsoft.AspNetCore.Mvc;

namespace Server.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class LoggedInController : ControllerBase
    {
        [HttpGet]
        public ActionResult<string> Ping()
        {
            return "You are now Online";
        }
    }
}
