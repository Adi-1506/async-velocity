const crypto = require("crypto");
const mongoose = require("mongoose");
const { rateLimit } = require("express-rate-limit");
const Counter = mongoose.model(
  "RateCounter",
  new mongoose.Schema({
    _id: String,
    totalHits: Number,
    resetTime: { type: Date, expires: 0 },
  }),
);
class MongoStore {
  constructor(prefix) {
    this.prefix = prefix + ":";
  }
  init(options) {
    this.windowMs = options.windowMs;
  }
  async increment(key) {
    const now = Date.now();
    const bucket = Math.floor(now / this.windowMs);
    const resetTime = new Date((bucket + 1) * this.windowMs);
    let row;
    try {
      row = await Counter.findOneAndUpdate(
        { _id: this.prefix + key + ":" + bucket },
        { $inc: { totalHits: 1 }, $setOnInsert: { resetTime } },
        { upsert: true, returnDocument: "after" },
      );
    } catch (e) {
      if (e.code !== 11000) throw e;
      row = await Counter.findOneAndUpdate(
        { _id: this.prefix + key + ":" + bucket },
        { $inc: { totalHits: 1 } },
        { returnDocument: "after" },
      );
    }
    return { totalHits: row.totalHits, resetTime: row.resetTime };
  }
  async decrement(key) {
    await Counter.updateOne(
      { _id: this.prefix + key + ":" + Math.floor(Date.now() / this.windowMs) },
      { $inc: { totalHits: -1 } },
    );
  }
  async resetKey(key) {
    await Counter.deleteOne({
      _id: this.prefix + key + ":" + Math.floor(Date.now() / this.windowMs),
    });
  }
}
function limiter(name, limit, windowMs = 15 * 60 * 1000, keyGenerator) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: new MongoStore(name),
    keyGenerator: keyGenerator
      ? (req) => name + ":" + keyGenerator(req)
      : undefined,
    message: { message: "Too many requests. Please try again later." },
  });
}
function originGuard(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const allowed = process.env.CLIENT_URL || "http://localhost:3000";
  if (req.get("origin") !== allowed)
    return res.status(403).json({ message: "Request origin rejected" });
  if (!req.is("application/json"))
    return res.status(415).json({ message: "Use application/json" });
  next();
}
function key() {
  const k = process.env.MFA_ENCRYPTION_KEY;
  if (!k || !/^[a-f0-9]{64}$/i.test(k))
    throw Object.assign(new Error("MFA is not configured"), { status: 503 });
  return Buffer.from(k, "hex");
}
function encrypt(value) {
  const iv = crypto.randomBytes(12),
    cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}
function decrypt(value) {
  const b = Buffer.from(value, "base64"),
    d = crypto.createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
}
async function checkPassword(password) {
  if (process.env.CHECK_BREACHED_PASSWORDS !== "true") return;
  const digest = crypto
    .createHash("sha1")
    .update(password)
    .digest("hex")
    .toUpperCase();
  const response = await fetch(
    "https://api.pwnedpasswords.com/range/" + digest.slice(0, 5),
    { headers: { "Add-Padding": "true" }, signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok)
    throw Object.assign(new Error("Password check unavailable"), {
      status: 503,
    });
  const body = await response.text();
  if (
    body
      .split("\n")
      .some(
        (line) =>
          line.split(":")[0] === digest.slice(5) &&
          Number(line.split(":")[1]) > 0,
      )
  )
    throw Object.assign(
      new Error("Choose a password that has not appeared in a data breach"),
      { status: 400 },
    );
}
module.exports = { limiter, originGuard, encrypt, decrypt, checkPassword };
