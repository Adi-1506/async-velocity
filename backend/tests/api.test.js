process.env.NODE_ENV = "test";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.MFA_ENCRYPTION_KEY = require("crypto")
  .randomBytes(32)
  .toString("hex");
const { test, before, after, beforeEach } = require("node:test"),
  assert = require("node:assert/strict");
const { MongoMemoryServer } = require("mongodb-memory-server"),
  mongoose = require("mongoose"),
  request = require("supertest"),
  bcrypt = require("bcrypt"),
  crypto = require("crypto"),
  http = require("http");
const { createApp } = require("../app");
const User = require("../models/User"),
  Team = require("../models/Team"),
  Standup = require("../models/Standup"),
  Session = require("../models/Session"),
  Notification = require("../models/Notification"),
  Digest = require("../models/Digest");
const { processTeam } = require("../jobs/scheduler");
const password = crypto.randomBytes(20).toString("hex");
let db, app, member, other, admin, team, otherTeam;
const send = (agent, method, path, body = {}) =>
  agent[method](path).set("Origin", process.env.CLIENT_URL).send(body);
async function login(user, adminMode = false) {
  const agent = request.agent(app);
  const r = await send(
    agent,
    "post",
    adminMode ? "/api/admin/auth/login" : "/api/auth/login",
    { email: user.email, password },
  );
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return agent;
}
before(async () => {
  db = await MongoMemoryServer.create();
  await mongoose.connect(db.getUri());
  app = createApp();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});
after(async () => {
  await mongoose.disconnect();
  await db?.stop();
});
beforeEach(async () => {
  await Promise.all(
    Object.values(mongoose.models).map((m) => m.deleteMany({})),
  );
  const hash = await bcrypt.hash(password, 4);
  [member, other, admin] = await User.create([
    {
      name: "Member",
      email: "member@example.test",
      password: hash,
      publicId: crypto.randomUUID(),
    },
    {
      name: "Other",
      email: "other@example.test",
      password: hash,
      publicId: crypto.randomUUID(),
    },
    {
      name: "Admin",
      email: "admin@example.test",
      password: hash,
      role: "superadmin",
      publicId: crypto.randomUUID(),
    },
  ]);
  [team, otherTeam] = await Team.create([
    {
      name: "Team A",
      publicId: crypto.randomUUID(),
      members: [member._id],
      admins: [admin._id],
      superAdmin: admin._id,
    },
    {
      name: "Team B",
      publicId: crypto.randomUUID(),
      members: [other._id],
      admins: [admin._id],
      superAdmin: admin._id,
    },
  ]);
});
test("private routes deny anonymous users and state changes require the allowed origin", async () => {
  assert.equal((await request(app).get("/api/teams")).status, 401);
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .send({ email: member.email, password })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .set("Origin", "https://evil.example")
        .send({ email: member.email, password })
    ).status,
    403,
  );
});
test("member sees only their teams; cross-team search and submission are forbidden", async () => {
  const a = await login(member);
  const list = await a.get("/api/teams");
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
  assert.equal(
    (
      await a
        .get("/api/standups/search")
        .query({ teamId: String(otherTeam._id), q: "secret" })
    ).status,
    403,
  );
  assert.equal(
    (
      await send(a, "post", "/api/standups", {
        teamId: String(otherTeam._id),
        yesterday: "Done",
        today: "Next",
        mood: "good",
      })
    ).status,
    403,
  );
});
test("check-in validates mood, rejects field tampering, and deduplicates concurrent writes", async () => {
  const a = await login(member),
    body = {
      teamId: String(team._id),
      yesterday: "Done",
      today: "Next",
      mood: "good",
    };
  assert.equal(
    (await send(a, "post", "/api/standups", { ...body, mood: "🙂" })).status,
    400,
  );
  assert.equal(
    (
      await send(a, "post", "/api/standups", {
        ...body,
        user: String(other._id),
      })
    ).status,
    400,
  );
  const results = await Promise.all([
    send(a, "post", "/api/standups", body),
    send(a, "post", "/api/standups", body),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await Standup.countDocuments(), 1);
});
test("logout invalidates copied cookie and session expiry is enforced", async () => {
  const r = await send(request(app), "post", "/api/auth/login", {
    email: member.email,
    password,
  });
  const cookie = r.headers["set-cookie"]
    .find((c) => c.startsWith("user_token=") && !c.startsWith("user_token=;"))
    .split(";")[0];
  assert.equal(
    (await request(app).get("/api/auth/me").set("Cookie", cookie)).status,
    200,
  );
  await request(app)
    .post("/api/auth/logout")
    .set("Cookie", cookie)
    .set("Origin", process.env.CLIENT_URL)
    .send({});
  assert.equal(
    (await request(app).get("/api/auth/me").set("Cookie", cookie)).status,
    401,
  );
  const a = await login(member);
  await Session.updateMany(
    { user: member._id },
    { $set: { expiresAt: new Date(0) } },
  );
  assert.equal((await a.get("/api/auth/me")).status, 401);
});
test("role changes revoke sessions and a removed member loses access", async () => {
  const a = await login(member),
    boss = await login(admin, true);
  const r = await send(
    boss,
    "delete",
    "/api/teams/" + team._id + "/members/" + member._id,
  );
  assert.equal(r.status, 200);
  assert.equal((await a.get("/api/teams")).status, 401);
});
test("safe filters reject object injection and literal regex search is bounded", async () => {
  assert.equal(
    (
      await send(request(app), "post", "/api/auth/login", {
        email: { $ne: null },
        password,
      })
    ).status,
    400,
  );
  const a = await login(member);
  assert.equal((await a.get("/api/teams?limit=100000")).status, 400);
  const r = await a
    .get("/api/standups/search")
    .query({ teamId: String(team._id), q: "(a+)+$" });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, []);
});
test("notifications enforce ownership and exclude private authentication fields", async () => {
  const n = await Notification.create({
    user: other._id,
    message: "Private",
    type: "reminder",
  });
  const a = await login(member);
  assert.equal(
    (await send(a, "patch", "/api/notifications/" + n._id + "/read")).status,
    404,
  );
  const me = await a.get("/api/auth/me");
  assert.ok(!("password" in me.body));
  assert.ok(!("mfaSecret" in me.body));
});
test("insights use selected range and count resolved blockers accurately", async () => {
  await Standup.create({
    user: member._id,
    team: team._id,
    publicId: crypto.randomUUID(),
    yesterday: "Done",
    today: "Next",
    blockers: "Waiting",
    blockerStatus: "open",
  });
  const a = await login(member);
  let r = await a.get("/api/insights/team/" + team._id + "?days=14");
  assert.equal(r.body.consistencyChart.length, 14);
  assert.equal(r.body.blockersReported, 1);
  assert.equal(r.body.blockersResolved, 0);
  const s = await Standup.findOne();
  assert.equal(
    (
      await send(a, "patch", "/api/standups/" + s._id + "/blocker", {
        status: "resolved",
      })
    ).status,
    200,
  );
  r = await a.get("/api/insights/team/" + team._id + "?days=7");
  assert.equal(r.body.blockersResolved, 1);
});
test("scheduler retries do not duplicate notifications/digests and handle midnight deadlines", async () => {
  // createdAt is immutable: set it on insertion so this fixture never depends
  // on the actual date when the suite runs.
  team = await Team.create({
    name: "Scheduled team",
    publicId: crypto.randomUUID(),
    members: [member._id],
    admins: [admin._id],
    superAdmin: admin._id,
    timezone: "UTC",
    standupTime: "23:30",
    workdays: [1, 2, 3, 4, 5, 6, 7],
    createdAt: new Date("2026-10-01T00:00:00Z"),
  });
  const now = new Date("2026-10-18T00:45:00Z");
  await processTeam(team, null, now);
  const nc = await Notification.countDocuments(),
    dc = await Digest.countDocuments();
  assert.ok(nc > 0);
  assert.ok(dc > 0);
  await processTeam(team, null, now);
  assert.equal(await Notification.countDocuments(), nc);
  assert.equal(await Digest.countDocuments(), dc);
  assert.ok(
    await Notification.exists({
      type: "missed_standup",
      user: member._id,
      dedupeKey: { $regex: "2026-10-17$" },
    }),
  );
});
test("MFA recovery codes are hashed, require a password, and cannot be replayed", async () => {
  const a = await login(member);
  const { authenticator } = require("otplib"),
    { encrypt } = require("../lib/security");
  const secret = authenticator.generateSecret();
  await User.updateOne(
    { _id: member._id },
    { $set: { mfaEnabled: true, mfaSecret: encrypt(secret), mfaLastStep: 0 } },
  );
  const generated = await send(a, "post", "/api/auth/mfa/recovery-codes", {
    password,
    code: authenticator.generate(secret),
  });
  assert.equal(generated.status, 200);
  assert.equal(generated.body.codes.length, 10);
  const stored = await User.findById(member._id).select("+mfaRecoveryHashes");
  assert.ok(
    stored.mfaRecoveryHashes.every((hash) => /^[a-f0-9]{64}$/.test(hash)),
  );
  assert.ok(!stored.mfaRecoveryHashes.includes(generated.body.codes[0]));
  assert.equal((await a.get("/api/auth/me")).body.mfaRecoveryHashes, undefined);
  const body = {
    email: member.email,
    password,
    recoveryCode: generated.body.codes[0],
  };
  assert.equal(
    (
      await send(request(app), "post", "/api/auth/mfa/recover", {
        ...body,
        password: "wrong",
      })
    ).status,
    401,
  );
  const results = await Promise.all(
    [1, 2].map(() => send(request(app), "post", "/api/auth/mfa/recover", body)),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 401]);
  assert.equal((await a.get("/api/teams")).status, 401);
  const recovered = await User.findById(member._id).select(
    "+mfaRecoveryHashes +mfaSecret",
  );
  assert.equal(recovered.mfaEnabled, false);
  assert.equal(recovered.mfaSecret, undefined);
  assert.equal(recovered.mfaRecoveryHashes, undefined);
});

test("Turnstile fails closed on missing tokens, provider errors and wrong hostnames", async () => {
  const fetch = global.fetch;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const required = process.env.REQUIRE_BOT_PROTECTION;
  try {
    process.env.REQUIRE_BOT_PROTECTION = "true";
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.equal(
      (await send(request(app), "post", "/api/auth/reset-password", {})).status,
      503,
    );
    process.env.TURNSTILE_SECRET_KEY = "test-provider-secret";
    assert.equal(
      (
        await send(request(app), "post", "/api/auth/login", {
          email: member.email,
          password,
        })
      ).status,
      400,
    );
    global.fetch = async () => ({
      json: async () => ({ success: true, hostname: "wrong.example.test" }),
    });
    assert.equal(
      (
        await send(request(app), "post", "/api/auth/login", {
          email: member.email,
          password,
          turnstileToken: "test",
        })
      ).status,
      400,
    );
    global.fetch = async () => {
      throw new Error("offline");
    };
    assert.equal(
      (
        await send(request(app), "post", "/api/auth/login", {
          email: member.email,
          password,
          turnstileToken: "test",
        })
      ).status,
      503,
    );
    global.fetch = async () => ({
      json: async () => ({ success: true, hostname: "localhost" }),
    });
    assert.equal(
      (
        await send(request(app), "post", "/api/auth/login", {
          email: member.email,
          password,
          turnstileToken: "test",
        })
      ).status,
      200,
    );
  } finally {
    global.fetch = fetch;
    if (secret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = secret;
    if (required === undefined) delete process.env.REQUIRE_BOT_PROTECTION;
    else process.env.REQUIRE_BOT_PROTECTION = required;
  }
});

test("passkey removal requires ownership and revokes sessions", async () => {
  const a = await login(member),
    Passkey = require("../models/Passkey");
  const key = await Passkey.create({
    user: other._id,
    credentialId: crypto.randomBytes(32).toString("base64url"),
    publicKey: crypto.randomBytes(32),
    counter: 0,
  });
  assert.equal(
    (await send(a, "delete", "/api/passkeys/" + key._id, { password })).status,
    404,
  );
  assert.ok(await Passkey.findById(key._id));
  await Passkey.updateOne({ _id: key._id }, { $set: { user: member._id } });
  assert.equal(
    (await send(a, "delete", "/api/passkeys/" + key._id, { password })).status,
    200,
  );
  assert.equal(await Passkey.findById(key._id), null);
  assert.equal((await a.get("/api/teams")).status, 401);
});

test("SMTP sends a usable expiring verification link through a local test server", async () => {
  const net = require("net"),
    { sendAction } = require("../lib/mail"),
    ActionToken = require("../models/ActionToken");
  const names = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "MAIL_FROM",
  ];
  const previous = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  let mail = "";
  const sockets = new Set();
  const smtp = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.write("220 localhost test SMTP\r\n");
    let buffer = "",
      data = false;
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      let end;
      while ((end = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data) {
          if (line === ".") {
            data = false;
            socket.write("250 accepted\r\n");
          } else mail += line + "\r\n";
        } else if (line.startsWith("EHLO") || line.startsWith("HELO"))
          socket.write("250 localhost\r\n");
        else if (line === "DATA") {
          data = true;
          socket.write("354 send data\r\n");
        } else if (line === "QUIT") socket.end("221 bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise((resolve) => smtp.listen(0, "127.0.0.1", resolve));
  try {
    Object.assign(process.env, {
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(smtp.address().port),
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      MAIL_FROM: "noreply@example.test",
    });
    await sendAction(member, "verify");
    const decoded = mail.replace(/=\r\n/g, "").replace(/=3D/g, "=");
    const token = decoded.match(/#token=([a-f0-9]{64})/)?.[1];
    assert.ok(token);
    const record = await ActionToken.findOne({
      user: member._id,
      purpose: "verify",
    });
    assert.equal(record.tokenHash, require("../lib/sessions").hash(token));
    assert.ok(record.expiresAt > new Date());
    assert.ok(record.expiresAt <= new Date(Date.now() + 30 * 60000));
    assert.equal(
      (await send(request(app), "post", "/api/auth/verify-email", { token }))
        .status,
      200,
    );
    assert.equal(
      (await send(request(app), "post", "/api/auth/verify-email", { token }))
        .status,
      400,
    );
  } finally {
    for (const name of names)
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => smtp.close(resolve));
  }
});

test("MFA requires a valid code and prevents code replay", async () => {
  const { authenticator } = require("otplib"),
    { encrypt } = require("../lib/security");
  const secret = authenticator.generateSecret();
  await User.updateOne(
    { _id: member._id },
    { $set: { mfaEnabled: true, mfaSecret: encrypt(secret) } },
  );
  assert.equal(
    (
      await send(request(app), "post", "/api/auth/login", {
        email: member.email,
        password,
      })
    ).status,
    401,
  );
  const code = authenticator.generate(secret);
  assert.equal(
    (
      await send(request(app), "post", "/api/auth/login", {
        email: member.email,
        password,
        code,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await send(request(app), "post", "/api/auth/login", {
        email: member.email,
        password,
        code,
      })
    ).status,
    401,
  );
});
test("socket requires authentication and refuses foreign team rooms", async () => {
  const { Server } = require("socket.io"),
    { attach } = require("../lib/sockets"),
    { io: client } = require("../../frontend/node_modules/socket.io-client");
  const server = http.createServer(app),
    io = new Server(server);
  attach(io);
  app.set("io", io);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port;
  const anonymous = client(url, {
    transports: ["websocket"],
    reconnection: false,
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("No auth failure")), 3000);
    anonymous.on("connect_error", () => {
      clearTimeout(t);
      resolve();
    });
  });
  anonymous.close();
  const r = await send(request(app), "post", "/api/auth/login", {
    email: member.email,
    password,
  });
  const cookie = r.headers["set-cookie"]
    .find((c) => c.startsWith("user_token=") && !c.startsWith("user_token=;"))
    .split(";")[0];
  const socket = client(url, {
    transports: ["websocket"],
    extraHeaders: { Cookie: cookie },
    reconnection: false,
  });
  try {
    await new Promise((resolve, reject) => {
      socket.on("connect", resolve);
      socket.on("connect_error", reject);
    });
    const denied = await socket
      .timeout(2000)
      .emitWithAck("join_team", String(otherTeam._id));
    assert.ok(denied.error);
    const allowed = await socket
      .timeout(2000)
      .emitWithAck("join_team", String(team._id));
    assert.equal(allowed.ok, true);
  } finally {
    socket.close();
    await new Promise((resolve) => io.close(resolve));
    app.set("io", null);
  }
});

test("reset and verification tokens expire and cannot be reused", async () => {
  const ActionToken = require("../models/ActionToken"),
    { hash } = require("../lib/sessions");
  const token = crypto.randomBytes(32).toString("hex");
  await ActionToken.create({
    tokenHash: hash(token),
    user: member._id,
    purpose: "verify",
    expiresAt: new Date(Date.now() + 60000),
  });
  assert.equal(
    (await send(request(app), "post", "/api/auth/verify-email", { token }))
      .status,
    200,
  );
  assert.equal(
    (await send(request(app), "post", "/api/auth/verify-email", { token }))
      .status,
    400,
  );
  const reset = crypto.randomBytes(32).toString("hex");
  const a = await login(member);
  await ActionToken.create({
    tokenHash: hash(reset),
    user: member._id,
    purpose: "reset",
    expiresAt: new Date(Date.now() + 60000),
  });
  const nextPassword = crypto.randomBytes(24).toString("hex");
  assert.equal(
    (
      await send(request(app), "post", "/api/auth/reset-password", {
        token: reset,
        password: nextPassword,
      })
    ).status,
    200,
  );
  assert.equal((await a.get("/api/auth/me")).status, 401);
  assert.equal(
    (
      await send(request(app), "post", "/api/auth/reset-password", {
        token: reset,
        password: nextPassword,
      })
    ).status,
    400,
  );
});
test("rate limits stop repeated per-account attempts without relying on client IP", async () => {
  for (let i = 0; i < 12; i++)
    assert.equal(
      (
        await send(request(app), "post", "/api/auth/login", {
          email: member.email,
          password: "wrong",
        })
      ).status,
      401,
    );
  assert.equal(
    (
      await send(request(app), "post", "/api/auth/login", {
        email: member.email,
        password: "wrong",
      })
    ).status,
    429,
  );
});
test("account exports require reauthentication and deletion disables access immediately", async () => {
  const a = await login(member);
  assert.equal(
    (await send(a, "post", "/api/account/export", { password: "wrong" }))
      .status,
    401,
  );
  const exported = await send(a, "post", "/api/account/export", { password });
  assert.equal(exported.status, 200);
  assert.ok(exported.text.includes(member.email));
  assert.ok(!exported.text.includes("password"));
  assert.equal(
    (await send(a, "post", "/api/account/delete", { password })).status,
    200,
  );
  assert.equal((await a.get("/api/auth/me")).status, 401);
  assert.equal(
    (
      await send(request(app), "post", "/api/auth/login", {
        email: member.email,
        password,
      })
    ).status,
    401,
  );
});
test("passkey challenges are expiring, single use and require authenticated enrollment", async () => {
  assert.equal(
    (
      await send(request(app), "post", "/api/passkeys/register/options", {
        password,
      })
    ).status,
    401,
  );
  const a = request.agent(app);
  assert.equal(
    (await send(a, "post", "/api/passkeys/login/options")).status,
    200,
  );
  const response = await send(a, "post", "/api/passkeys/login/verify", {
    id: "invalid",
  });
  assert.equal(response.status, 401);
  assert.equal(await require("../models/Challenge").countDocuments(), 0);
});
