const crypto = require("crypto");
const Session = require("../models/Session");
const User = require("../models/User");
const hash = (v) => crypto.createHash("sha256").update(v).digest("hex");
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});
async function lookup(token, kind) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await Session.findOne({
    tokenHash: hash(token),
    kind,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const user = await User.findById(session.user);
  if (
    !user ||
    user.deletedAt ||
    (kind === "admin" && !["admin", "superadmin"].includes(user.role))
  )
    return null;
  return { session, user };
}
async function authenticate(cookies, adminOnly = false) {
  if (adminOnly) return lookup(cookies?.admin_token, "admin");
  return (
    (await lookup(cookies?.user_token, "user")) ||
    (await lookup(cookies?.admin_token, "admin"))
  );
}
async function revokeCookies(cookies, io) {
  for (const [name, kind] of [
    ["user_token", "user"],
    ["admin_token", "admin"],
  ]) {
    const token = cookies?.[name];
    if (typeof token !== "string") continue;
    const s = await Session.findOneAndDelete({ tokenHash: hash(token), kind });
    if (s && io) io.in("session:" + s._id).disconnectSockets(true);
  }
}
async function create(req, res, user, kind) {
  await revokeCookies(req.cookies, req.app.get("io"));
  for (const name of ["user_token", "admin_token"])
    res.clearCookie(name, cookieOptions());
  const token = crypto.randomBytes(32).toString("hex"),
    lifetime = 8 * 60 * 60 * 1000;
  await Session.create({
    tokenHash: hash(token),
    user: user._id,
    kind,
    device: (req.get("user-agent") || "Unknown device").slice(0, 200),
    expiresAt: new Date(Date.now() + lifetime),
  });
  res.cookie(kind + "_token", token, { ...cookieOptions(), maxAge: lifetime });
}
async function revokeUser(user, io) {
  await Session.deleteMany({ user });
  if (io) io.in("user:" + user).disconnectSockets(true);
}
module.exports = {
  hash,
  cookieOptions,
  authenticate,
  create,
  revokeCookies,
  revokeUser,
};
