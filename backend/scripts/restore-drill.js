// Uses disposable databases only; never reads MONGO_URI from the application environment.
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose"),
  fs = require("fs/promises"),
  path = require("path"),
  os = require("os"),
  crypto = require("crypto"),
  assert = require("node:assert/strict"),
  { spawn } = require("child_process");
const request = require("supertest"),
  bcrypt = require("bcrypt");
let stage = "setup";
// MongoDB may rebuild indexes in a different order during restoration.
const orderedIndexes = (indexes) =>
  [...indexes].sort((a, b) => a.name.localeCompare(b.name));
async function run(args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(__dirname, "backup.js"), ...args],
      { env, stdio: ["ignore", "inherit", "inherit"], windowsHide: true },
    );
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("Backup/restore command failed")),
    );
  });
}
async function drill() {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "standup-restore-drill-"),
  );
  const mongo = await MongoMemoryServer.create();
  try {
    process.env.NODE_ENV = "test";
    process.env.CLIENT_URL = "http://localhost:3000";
    process.env.REQUIRE_EMAIL_VERIFICATION = "false";
    process.env.REQUIRE_BOT_PROTECTION = "false";
    delete process.env.TURNSTILE_SECRET_KEY;
    const { createApp } = require("../app");
    const app = createApp();
    const source = mongo.getUri("drill_source"),
      target = mongo.getUri("drill_restored");
    await mongoose.connect(source);
    await Promise.all(
      Object.values(mongoose.models).map((model) => model.init()),
    );
    const password = crypto.randomBytes(20).toString("hex");
    const user = await mongoose
      .model("User")
      .create({
        name: "Restore fixture",
        email: "restore@example.test",
        publicId: crypto.randomUUID(),
        password: await bcrypt.hash(password, 4),
      });
    const team = await mongoose
      .model("Team")
      .create({
        name: "Restore team",
        publicId: crypto.randomUUID(),
        members: [user._id],
        admins: [],
        superAdmin: user._id,
      });
    const counts = {};
    for (const model of Object.values(mongoose.models))
      counts[model.modelName] = await model.countDocuments();
    const indexes = await mongoose.model("User").collection.indexes();
    await mongoose.disconnect();
    const env = {
      ...process.env,
      MONGO_URI: source,
      RESTORE_MONGO_URI: target,
      BACKUP_DIRECTORY: directory,
      BACKUP_ENCRYPTION_KEY: crypto.randomBytes(32).toString("hex"),
      BACKUP_DB_NAME: "drill_source",
      RESTORE_DB_NAME: "drill_restored",
      RESTORE_CONFIRM: "RESTORE_TO_ISOLATED_DATABASE",
    };
    stage = "encrypted backup";
    await run([], env);
    const archive = (await fs.readdir(directory)).find((name) =>
      name.endsWith(".enc"),
    );
    assert.ok(archive);
    stage = "database restore";
    await run(["restore", path.join(directory, archive)], env);
    await mongoose.connect(target, { autoIndex: false, autoCreate: false });
    stage = "collection counts";
    for (const model of Object.values(mongoose.models))
      assert.equal(await model.countDocuments(), counts[model.modelName]);
    stage = "index definitions";
    assert.deepEqual(
      orderedIndexes(await mongoose.model("User").collection.indexes()),
      orderedIndexes(indexes),
    );
    stage = "restored login";
    const agent = request.agent(app);
    const login = await agent
      .post("/api/auth/login")
      .set("Origin", process.env.CLIENT_URL)
      .send({ email: user.email, password });
    assert.equal(login.status, 200);
    stage = "restored team access";
    const teams = await agent.get("/api/teams");
    assert.equal(teams.status, 200);
    assert.equal(teams.body[0]._id, String(team._id));
    console.log(
      "Restore drill passed: encrypted archive, collection counts, unique indexes, login and team access verified in an isolated database.",
    );
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
    for (const file of await fs.readdir(directory))
      await fs.unlink(path.join(directory, file));
    await fs.rmdir(directory);
  }
}
drill().catch(() => {
  console.error(
    "Isolated restore drill failed at " + stage + ". No application database was used.",
  );
  process.exitCode = 1;
});
