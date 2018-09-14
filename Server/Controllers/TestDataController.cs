using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;


namespace BuildProfiler.Server.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class TestDataController
    {
        [HttpGet]
        public ActionResult<string> Get()
        {
            return "You get this data since you have logged in.";
        }
    }
}
