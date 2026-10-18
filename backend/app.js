const express = require("express"),
  helmet = require("helmet"),
  cors = require("cors"),
  cookieParser = require("cookie-parser");
const { limiter, originGuard } = require("./lib/security");
const Audit = require("./models/Audit");
function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY_HOPS)
    app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
  app.use(
    helmet({
      strictTransportSecurity:
        process.env.NODE_ENV === "production"
          ? { maxAge: 63072000, includeSubDomains: true, preload: true }
          : false,
    }),
  );
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
      exposedHeaders: ["RateLimit", "Retry-After"],
    }),
  );
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production" && !req.secure)
      return res.status(400).json({ message: "HTTPS is required" });
    next();
  });
  app.get("/health", (_req, res) =>
    res.json({
      status:
        require("mongoose").connection.readyState === 1 ? "ok" : "unavailable",
    }),
  );
  app.use("/api", limiter("api", 300, 60 * 1000));
  app.use((req, res, next) => {
    const isApi=req.path.startsWith("/api/");
    const category=["auth","admin","passkeys","account","teams","standups","digests","notifications","insights"].find(x=>req.path===("/api/"+x)||req.path.startsWith("/api/"+x+"/"))||"unknown";
    res.on("finish", () => {
      if (
        isApi &&
        (req.method !== "GET" ||
          res.statusCode === 401 ||
          res.statusCode === 403)
      ) {
        Audit.create({
          actor: req.user?._id,
          event: req.method + " " + category + " " + (typeof req.route?.path === "string" ? req.route.path : "unmatched"),
          outcome: res.statusCode,
        }).catch(() => console.error("Audit write failed"));
      }
    });
    next();
  });
  app.use(
    express.json({ limit: "32kb", strict: true }),
    cookieParser(),
    originGuard,
  );
  app.use("/api/auth", limiter("auth-ip", 50), require("./routes/auth.routes"));
  app.use(
    "/api/admin/auth",
    limiter("admin-auth-ip", 30),
    require("./routes/adminAuth.routes"),
  );
  app.use(
    "/api/passkeys",
    limiter("passkeys", 30),
    require("./routes/passkey.routes"),
  );
  app.use(
    "/api/account",
    limiter("account-sensitive", 10),
    require("./routes/account.routes"),
  );
  for (const [path, file] of [
    ["teams", "team"],
    ["standups", "standup"],
    ["digests", "digest"],
    ["notifications", "notification"],
    ["insights", "insights"],
  ])
    app.use("/api/" + path, require("./routes/" + file + ".routes"));
  app.use((_req, res) => res.status(404).json({ message: "Not found" }));
  app.use((error, req, res, _next) => {
    if (error.code === 11000)
      return res.status(409).json({ message: "This record already exists" });
    if (
      error.name === "ZodError" ||
      error.name === "ValidationError" ||
      error.name === "CastError" ||
      error.type === "entity.parse.failed"
    )
      return res.status(400).json({ message: "Invalid request" });
    if (error.type === "entity.too.large")
      return res.status(413).json({ message: "Request is too large" });
    const status = [400, 401, 403, 404, 409, 503].includes(error.status)
      ? error.status
      : 500;
    if (status === 500) console.error("Request failed", { type: error.name }); // Never log request bodies or database errors.
    res.status(status).json({
      message:
        status === 500
          ? "Server error"
          : status === 503
            ? "Service is not configured or temporarily unavailable"
            : error.message,
    });
  });
  return app;
}
module.exports = { createApp };
