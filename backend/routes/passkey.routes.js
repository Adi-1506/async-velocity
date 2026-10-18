const router = require("express").Router(),
  crypto = require("crypto"),
  webauthn = require("@simplewebauthn/server");
const Passkey = require("../models/Passkey"),
  Challenge = require("../models/Challenge"),
  User = require("../models/User");
const auth = require("../middleware/authUser.middleware"),
  { reauth } = require("./auth.routes"),
  sessions = require("../lib/sessions");
const { z, validate, id } = require("../lib/validation");
const origin = () => process.env.CLIENT_URL || "http://localhost:3000",
  rpID = () => new URL(origin()).hostname;
const credentials = validate(
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
async function issue(req, res, purpose, options) {
  const token = crypto.randomBytes(32).toString("hex");
  await Challenge.create({
    tokenHash: sessions.hash(token),
    challenge: options.challenge,
    purpose,
    user: req.user?._id,
    session: req.session?._id,
    expiresAt: new Date(Date.now() + 300000),
  });
  res.cookie("passkey_challenge", token, {
    ...sessions.cookieOptions(),
    maxAge: 300000,
  });
  res.json(options);
}
async function consume(req, res, purpose) {
  const token = req.cookies.passkey_challenge;
  res.clearCookie("passkey_challenge", sessions.cookieOptions());
  if (typeof token !== "string") return null;
  return Challenge.findOneAndDelete({
    tokenHash: sessions.hash(token),
    purpose,
    ...(purpose === "register"
      ? { user: req.user._id, session: req.session._id }
      : {}),
    expiresAt: { $gt: new Date() },
  });
}
router.get("/", auth, async (req, res) =>
  res.json(
    await Passkey.find({ user: req.user._id })
      .select("_id createdAt")
      .limit(20),
  ),
);
router.post("/register/options", auth, credentials, async (req, res) => {
  await reauth(req);
  const keys = await Passkey.find({ user: req.user._id });
  if (keys.length >= 10)
    return res
      .status(400)
      .json({ message: "At most ten passkeys are allowed" });
  const options = await webauthn.generateRegistrationOptions({
    rpName: "StandupBot",
    rpID: rpID(),
    userID: new TextEncoder().encode(req.user.publicId),
    userName: req.user.email,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    excludeCredentials: keys.map((k) => ({
      id: k.credentialId,
      transports: k.transports,
    })),
  });
  await issue(req, res, "register", options);
});
router.post("/register/verify", auth, async (req, res) => {
  const challenge = await consume(req, res, "register");
  if (!challenge)
    return res.status(400).json({ message: "Invalid or expired challenge" });
  let result;
  try {
    result = await webauthn.verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin(),
      expectedRPID: rpID(),
      requireUserVerification: true,
    });
  } catch {
    return res.status(400).json({ message: "Passkey verification failed" });
  }
  if (!result.verified || !result.registrationInfo)
    return res.status(400).json({ message: "Passkey verification failed" });
  const c = result.registrationInfo.credential;
  await Passkey.create({
    credentialId: c.id,
    user: req.user._id,
    publicKey: Buffer.from(c.publicKey),
    counter: c.counter,
    transports: c.transports,
  });
  res.json({ message: "Passkey registered" });
});
router.post("/login/options", async (req, res) =>
  issue(
    req,
    res,
    "login",
    await webauthn.generateAuthenticationOptions({
      rpID: rpID(),
      userVerification: "required",
    }),
  ),
);
router.post("/login/verify", async (req, res) => {
  const challenge = await consume(req, res, "login"),
    parsed = z.string().max(2048).safeParse(req.body?.id);
  if (!challenge || !parsed.success)
    return res.status(401).json({ message: "Passkey verification failed" });
  const key = await Passkey.findOne({ credentialId: parsed.data }).select(
    "+publicKey",
  );
  if (!key)
    return res.status(401).json({ message: "Passkey verification failed" });
  let result;
  try {
    result = await webauthn.verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin(),
      expectedRPID: rpID(),
      requireUserVerification: true,
      credential: {
        id: key.credentialId,
        publicKey: new Uint8Array(key.publicKey),
        counter: key.counter,
        transports: key.transports,
      },
    });
  } catch {
    return res.status(401).json({ message: "Passkey verification failed" });
  }
  if (!result.verified)
    return res.status(401).json({ message: "Passkey verification failed" });
  const update = await Passkey.updateOne(
    { _id: key._id, counter: key.counter },
    { $set: { counter: result.authenticationInfo.newCounter } },
  );
  if (update.matchedCount !== 1)
    return res.status(401).json({ message: "Passkey verification failed" });
  const user = await User.findById(key.user);
  if (
    !user ||
    user.deletedAt ||
    (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.emailVerified)
  )
    return res.status(401).json({ message: "Passkey verification failed" });
  req.user = user;
  await sessions.create(
    req,
    res,
    user,
    ["admin", "superadmin"].includes(user.role) ? "admin" : "user",
  );
  res.json({ message: "Signed in", role: user.role });
});
router.delete("/:id", auth, credentials, async (req, res) => {
  await reauth(req);
  id.parse(req.params.id);
  const removed = await Passkey.deleteOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!removed.deletedCount)
    return res.status(404).json({ message: "Passkey not found" });
  await sessions.revokeUser(req.user._id, req.app.get("io"));
  res.json({ message: "Passkey removed; sign in again" });
});
module.exports = router;
