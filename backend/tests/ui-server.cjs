process.chdir(require("path").resolve(__dirname, ".."));
process.env.NODE_ENV = "test";
process.env.CLIENT_URL = "http://localhost:3100";
process.env.MFA_ENCRYPTION_KEY = require("crypto")
  .randomBytes(32)
  .toString("hex");
const { MongoMemoryServer } = require("mongodb-memory-server"),
  mongoose = require("mongoose"),
  bcrypt = require("bcrypt"),
  crypto = require("crypto"),
  http = require("http");
const { Server } = require("socket.io"),
  { createApp } = require("../app"),
  { attach } = require("../lib/sockets");
const User = require("../models/User"),
  Team = require("../models/Team"),
  Notification = require("../models/Notification");
(async () => {
  const db = await MongoMemoryServer.create();
  await mongoose.connect(db.getUri());
  const password = await bcrypt.hash(
    crypto
      .createHash("sha256")
      .update("standup-e2e-fixture-only")
      .digest("hex"),
    4,
  );
  const [member, admin] = await User.create([
    {
      publicId: crypto.randomUUID(),
      name: "Alex Member",
      email: "member@example.test",
      password,
    },
    {
      publicId: crypto.randomUUID(),
      name: "Sam Admin",
      email: "admin@example.test",
      password,
      role: "superadmin",
    },
  ]);
  const team = await Team.create({
    publicId: crypto.randomUUID(),
    name: "Product team",
    members: [member._id],
    admins: [admin._id],
    superAdmin: admin._id,
  });
  await Notification.create({
    user: member._id,
    team: team._id,
    type: "reminder",
    message: "Welcome! Share your first check-in.",
  });
  const app = createApp();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  const server = http.createServer(app),
    io = new Server(server, {
      cors: { origin: process.env.CLIENT_URL, credentials: true },
    });
  app.set("io", io);
  attach(io);
  server.listen(5055, () => console.log("Isolated browser-test API ready"));
  async function stop() {
    io.close();
    server.close();
    await mongoose.disconnect();
    await db.stop();
    process.exit(0);
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
})().catch((e) => {
  console.error(e.name);
  process.exit(1);
});
