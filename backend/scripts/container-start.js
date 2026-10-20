// Distroless has no shell; run the launch gate before starting the API.
process.argv.push("--app-only");
require("./preflight");
if (!process.exitCode) {
  require("../server").start().catch(() => {
    console.error("Startup failed. Check database connectivity and configuration.");
    process.exitCode = 1;
  });
}
