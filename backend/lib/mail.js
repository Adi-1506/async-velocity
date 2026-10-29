const nodemailer = require("nodemailer");
const crypto = require("crypto");
const ActionToken = require("../models/ActionToken");
const { hash } = require("./sessions");
function configured() {
  return !!process.env.SMTP_HOST && !!process.env.MAIL_FROM;
}
async function sendAction(user, purpose) {
  if (!configured())
    throw Object.assign(new Error("Email delivery is not configured"), {
      status: 503,
    });
  const token = crypto.randomBytes(32).toString("hex");
  await ActionToken.deleteMany({ user: user._id, purpose });
  const row = await ActionToken.create({
    user: user._id,
    purpose,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });
  const url = new URL(
    purpose === "reset" ? "/reset-password" : "/verify-email",
    process.env.CLIENT_URL || "http://localhost:3000",
  );
  url.hash = new URLSearchParams({ token }).toString();
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    requireTLS: process.env.NODE_ENV === "production",
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: user.email,
      subject:
        purpose === "reset"
          ? "Reset your Daybrief password"
          : "Confirm your email for Daybrief",
      text:
        "Use this link within 30 minutes: " +
        url.toString() +
        "\nIf you didn't ask for this, you can ignore this email.",
    });
  } catch (e) {
    await ActionToken.deleteOne({ _id: row._id });
    throw Object.assign(new Error("Email delivery unavailable"), {
      status: 503,
    });
  }
}
module.exports = { configured, sendAction };
