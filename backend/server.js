require("dotenv").config();
const mongoose = require("mongoose"),
  http = require("http");
const { Server } = require("socket.io");
const { createApp } = require("./app");
const { attach } = require("./lib/sockets");
const { startJobs } = require("./jobs/scheduler");
async function start() {
  if (process.env.NODE_ENV === "production") {
    if (
      !process.env.MONGO_URI ||
      !process.env.CLIENT_URL?.startsWith("https://")
    )
      throw new Error("Production requires MONGO_URI and HTTPS CLIENT_URL");
    if (!/^[a-f0-9]{64}$/i.test(process.env.MFA_ENCRYPTION_KEY || ""))
      throw new Error("Production requires MFA_ENCRYPTION_KEY");
  }
  const app = createApp();
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/async-standup-bot",
    {
      autoIndex: process.env.NODE_ENV !== "production",
      autoCreate: process.env.NODE_ENV !== "production",
    },
  );
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init()),
  );
  const server = http.createServer(app),
    origin = process.env.CLIENT_URL || "http://localhost:3000";
  const io = new Server(server, {
    cors: { origin, credentials: true },
    allowRequest: (req, cb) => cb(null, req.headers.origin === origin),
    maxHttpBufferSize: 16384,
  });
  app.set("io", io);
  attach(io);
  const job = startJobs(io);
  server.listen(Number(process.env.PORT || 5000), "0.0.0.0", () =>
    console.log("StandupBot API is ready"),
  );
  const shutdown = () => {
    job.stop();
    io.close();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
if (require.main === module)
  start().catch(() => {
    console.error(
      "Startup failed. Check database connectivity and required configuration.",
    );
    process.exitCode = 1;
  });
module.exports = { start };
