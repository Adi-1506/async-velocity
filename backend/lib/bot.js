module.exports = async function botGuard(req, res, next) {
  const token = req.body?.turnstileToken;
  if (req.body) delete req.body.turnstileToken;
  if (!process.env.TURNSTILE_SECRET_KEY) {
    if (process.env.REQUIRE_BOT_PROTECTION === "true")
      return res
        .status(503)
        .json({ message: "Bot protection is not configured" });
    return next();
  }
  if (typeof token !== "string" || token.length > 2048 || !token)
    return res
      .status(400)
      .json({ message: "Complete the security check and try again" });
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    const data = await response.json();
    if (
      !data.success ||
      data.hostname !==
        new URL(process.env.CLIENT_URL || "http://localhost:3000").hostname
    )
      return res
        .status(400)
        .json({ message: "Security check failed. Try again" });
    next();
  } catch {
    return res
      .status(503)
      .json({ message: "Security check temporarily unavailable" });
  }
};
