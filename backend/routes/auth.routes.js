const express = require("express"),
  bcrypt = require("bcrypt"),
  crypto = require("crypto");
const { authenticator } = require("otplib");
const User = require("../models/User"),
  Session = require("../models/Session"),
  ActionToken = require("../models/ActionToken");
const auth = require("../middleware/authUser.middleware");
const sessions = require("../lib/sessions");
const {
  z,
  email,
  password,
  schemas,
  validate,
  id,
} = require("../lib/validation");
const { limiter, encrypt, decrypt, checkPassword } = require("../lib/security");
const mail = require("../lib/mail");
const router = express.Router();
const botGuard = require("../lib/bot");
const { queue } = require("../jobs/mail");
const dummy = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 12);
const accountLimit = limiter("account", 12, 15 * 60 * 1000, (req) =>
  sessions.hash(
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "invalid",
  ),
);
const safeUser = (u) => ({
  _id: u._id,
  publicId: u.publicId,
  name: u.name,
  email: u.email,
  role: u.role,
  emailVerified: u.emailVerified,
  mfaEnabled: u.mfaEnabled,
});
async function verifyMfa(user, code) {
  if (!user.mfaEnabled) return true;
  if (!code || !authenticator.check(code, decrypt(user.mfaSecret)))
    return false;
  const step = Math.floor(Date.now() / 30000);
  const result = await User.updateOne(
    {
      _id: user._id,
      $or: [
        { mfaLastStep: { $lt: step } },
        { mfaLastStep: { $exists: false } },
      ],
    },
    { $set: { mfaLastStep: step } },
  );
  return result.modifiedCount === 1;
}
async function reauth(req) {
  const user = await User.findById(req.user._id).select(
    "+password +mfaSecret +mfaLastStep",
  );
  const ok =
    typeof req.body.password === "string" &&
    (await bcrypt.compare(req.body.password, user.password));
  if (!ok || !(await verifyMfa(user, req.body.code)))
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  return user;
}
function login(kind) {
  return async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select(
      "+password +mfaSecret +mfaLastStep",
    );
    const valid = await bcrypt.compare(
      req.body.password,
      user?.password || dummy,
    );
    if (
      !valid ||
      user?.deletedAt ||
      !user ||
      (kind === "admin" && !["admin", "superadmin"].includes(user.role)) ||
      !(await verifyMfa(user, req.body.code))
    )
      return res.status(401).json({ message: "Invalid credentials" });
    if (
      process.env.REQUIRE_EMAIL_VERIFICATION === "true" &&
      !user.emailVerified
    )
      return res
        .status(403)
        .json({ message: "Verify your email before signing in" });
    await sessions.create(
      req,
      res,
      user,
      ["admin", "superadmin"].includes(user.role) ? "admin" : kind,
    );
    req.user = user;
    res.json({
      message: "Signed in",
      ...safeUser(user),
      isSuperAdmin: user.role === "superadmin",
    });
  };
}
router.post(
  "/register",
  accountLimit,
  botGuard,
  validate(schemas.register),
  async (req, res) => {
    await checkPassword(req.body.password);
    const hashed = await bcrypt.hash(req.body.password, 12);
    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      try {
        user = await User.create({
          publicId: "USR-" + crypto.randomUUID(),
          name: req.body.name,
          email: req.body.email,
          password: hashed,
        });
      } catch (e) {
        if (e.code !== 11000) throw e;
      }
    }
    if (user && !user.emailVerified && mail.configured())
      await queue(user, "verify");
    res.status(202).json({
      message:
        "If registration can proceed, your account is ready. If verification is enabled, check your email.",
    });
  },
);
router.post(
  "/login",
  accountLimit,
  botGuard,
  validate(schemas.login),
  login("user"),
);
router.post("/logout", async (req, res) => {
  await sessions.revokeCookies(req.cookies, req.app.get("io"));
  for (const n of ["user_token", "admin_token"])
    res.clearCookie(n, sessions.cookieOptions());
  res.json({ message: "Signed out" });
});
router.get("/me", auth, (req, res) => res.json(safeUser(req.user)));
router.get("/sessions", auth, async (req, res) =>
  res.json(
    await Session.find({ user: req.user._id, expiresAt: { $gt: new Date() } })
      .select("_id device createdAt expiresAt")
      .sort({ createdAt: -1 })
      .limit(100),
  ),
);
router.delete("/sessions/:id", auth, async (req, res) => {
  id.parse(req.params.id);
  const s = await Session.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (s)
    req.app
      .get("io")
      ?.in("session:" + s._id)
      .disconnectSockets(true);
  res.json({ message: "Session revoked" });
});
router.post("/logout-all", auth, async (req, res) => {
  await sessions.revokeUser(req.user._id, req.app.get("io"));
  for (const n of ["user_token", "admin_token"])
    res.clearCookie(n, sessions.cookieOptions());
  res.json({ message: "All sessions revoked" });
});
const sensitive = validate(
  z
    .object({
      password: z.string().min(1).max(200),
      code: z
        .string()
        .regex(/^\d{6}$/)
        .optional(),
    })
    .strict(),
);
router.post(
  "/password",
  auth,
  validate(
    z
      .object({
        password: z.string().min(1).max(200),
        newPassword: password,
        code: z
          .string()
          .regex(/^\d{6}$/)
          .optional(),
      })
      .strict(),
  ),
  async (req, res) => {
    const user = await reauth(req);
    await checkPassword(req.body.newPassword);
    user.password = await bcrypt.hash(req.body.newPassword, 12);
    await user.save();
    await sessions.revokeUser(user._id, req.app.get("io"));
    res.json({ message: "Password changed. Sign in again." });
  },
);
router.post(
  "/forgot-password",
  accountLimit,
  botGuard,
  validate(z.object({ email, website: z.string().max(0).optional() }).strict()),
  async (req, res) => {
    if (!mail.configured())
      return res
        .status(503)
        .json({ message: "Email delivery is not configured" });
    const user = await User.findOne({ email: req.body.email });
    if (user) await queue(user, "reset");
    res
      .status(202)
      .json({ message: "If the account exists, a reset link will be sent" });
  },
);
router.post(
  "/reset-password",
  botGuard,
  validate(
    z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        password,
        website: z.string().max(0).optional(),
        code: z
          .string()
          .regex(/^\d{6}$/)
          .optional(),
      })
      .strict(),
  ),
  async (req, res) => {
    const filter = {
      tokenHash: sessions.hash(req.body.token),
      purpose: "reset",
      expiresAt: { $gt: new Date() },
    };
    const pending = await ActionToken.findOne(filter);
    if (!pending)
      return res.status(400).json({ message: "Invalid or expired link" });
    const user = await User.findById(pending.user).select(
      "+mfaSecret +mfaLastStep",
    );
    if (!user || !(await verifyMfa(user, req.body.code)))
      return res.status(400).json({ message: "Invalid credentials" });
    await checkPassword(req.body.password);
    const hash = await bcrypt.hash(req.body.password, 12);
    const token = await ActionToken.findOneAndDelete(filter);
    if (!token)
      return res.status(400).json({ message: "Invalid or expired link" });
    await User.updateOne({ _id: token.user }, { $set: { password: hash } });
    await sessions.revokeUser(token.user, req.app.get("io"));
    res.json({ message: "Password reset. Sign in again." });
  },
);
router.post(
  "/verify-email",
  validate(z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict()),
  async (req, res) => {
    const token = await ActionToken.findOneAndDelete({
      tokenHash: sessions.hash(req.body.token),
      purpose: "verify",
      expiresAt: { $gt: new Date() },
    });
    if (!token)
      return res.status(400).json({ message: "Invalid or expired link" });
    await User.updateOne(
      { _id: token.user },
      { $set: { emailVerified: true } },
    );
    res.json({ message: "Email verified" });
  },
);
router.post(
  "/resend-verification",
  accountLimit,
  auth,
  validate(z.object({ email }).strict()),
  async (req, res) => {
    if (!mail.configured())
      return res
        .status(503)
        .json({ message: "Email delivery is not configured" });
    const user = req.user;
    if (user && !user.emailVerified) await queue(user, "verify");
    res
      .status(202)
      .json({ message: "If verification is needed, a link will be sent" });
  },
);
router.post("/mfa/setup", auth, sensitive, async (req, res) => {
  const user = await reauth(req);
  if (user.mfaEnabled)
    return res.status(409).json({ message: "MFA is already enabled" });
  const secret = authenticator.generateSecret();
  await User.updateOne(
    { _id: user._id },
    { $set: { pendingMfaSecret: encrypt(secret) } },
  );
  res.json({
    secret,
    uri: authenticator.keyuri(user.email, "Daybrief", secret),
  });
});
router.post(
  "/mfa/enable",
  auth,
  validate(z.object({ code: z.string().regex(/^\d{6}$/) }).strict()),
  async (req, res) => {
    const user = await User.findById(req.user._id).select("+pendingMfaSecret");
    if (
      !user.pendingMfaSecret ||
      !authenticator.check(req.body.code, decrypt(user.pendingMfaSecret))
    )
      return res.status(400).json({ message: "Invalid code" });
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          mfaEnabled: true,
          mfaSecret: user.pendingMfaSecret,
          mfaLastStep: Math.floor(Date.now() / 30000),
        },
        $unset: { pendingMfaSecret: 1 },
      },
    );
    await sessions.revokeUser(user._id, req.app.get("io"));
    res.json({ message: "MFA enabled. Sign in again." });
  },
);
router.post("/mfa/recovery-codes", auth, sensitive, async (req, res) => {
  const user = await reauth(req);
  if (!user.mfaEnabled)
    return res.status(409).json({ message: "Enable MFA first" });
  const codes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(16).toString("hex"),
  );
  const update = await User.updateOne(
    { _id: user._id, mfaEnabled: true },
    { $set: { mfaRecoveryHashes: codes.map(sessions.hash) } },
  );
  if (!update.matchedCount)
    return res.status(409).json({ message: "Enable MFA first" });
  res.json({ codes });
});
router.post(
  "/mfa/recover",
  accountLimit,
  botGuard,
  validate(
    z
      .object({
        email,
        password: z.string().min(1).max(200),
        recoveryCode: z.string().regex(/^[a-f0-9]{32}$/),
        website: z.string().max(0).optional(),
      })
      .strict(),
  ),
  async (req, res) => {
    const user = await User.findOne({
      email: req.body.email,
      deletedAt: null,
    }).select("+password");
    const validPassword = await bcrypt.compare(
      req.body.password,
      user?.password || dummy,
    );
    if (!user || !validPassword)
      return res.status(401).json({ message: "Recovery failed" });
    // The same atomic update consumes all codes and disables MFA. Concurrent replays cannot succeed.
    const update = await User.updateOne(
      {
        _id: user._id,
        deletedAt: null,
        password: user.password,
        mfaEnabled: true,
        mfaRecoveryHashes: sessions.hash(req.body.recoveryCode),
      },
      {
        $set: { mfaEnabled: false },
        $unset: {
          mfaSecret: 1,
          pendingMfaSecret: 1,
          mfaLastStep: 1,
          mfaRecoveryHashes: 1,
        },
      },
    );
    if (!update.modifiedCount)
      return res.status(401).json({ message: "Recovery failed" });
    req.user = user;
    await sessions.revokeUser(user._id, req.app.get("io"));
    res.json({
      message:
        "Authenticator removed and sessions revoked. Sign in and set up MFA again; all old recovery codes are invalid.",
    });
  },
);
router.post("/mfa/disable", auth, sensitive, async (req, res) => {
  const user = await reauth(req);
  await User.updateOne(
    { _id: user._id },
    {
      $set: { mfaEnabled: false },
      $unset: {
        mfaSecret: 1,
        pendingMfaSecret: 1,
        mfaLastStep: 1,
        mfaRecoveryHashes: 1,
      },
    },
  );
  await sessions.revokeUser(user._id, req.app.get("io"));
  res.json({ message: "MFA disabled. Sign in again." });
});
module.exports = router;
module.exports.login = login;
module.exports.accountLimit = accountLimit;

module.exports.reauth = reauth;
