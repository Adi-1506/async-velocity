function productionIssues(env, { includeBackups = true } = {}) {
  const issues = [];
  const requireValue = (name) => {
    if (!env[name]) issues.push(name + " is required");
  };
  const httpsOrigin = (name) => {
    try {
      const u = new URL(env[name]);
      if (
        u.protocol !== "https:" ||
        u.username ||
        u.password ||
        u.origin !== env[name] ||
        ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
      )
        throw new Error();
    } catch {
      issues.push(
        name + " must be a public HTTPS origin without a trailing slash",
      );
    }
  };
  if (env.NODE_ENV !== "production") issues.push("NODE_ENV must be production");
  for (const name of [
    "CLIENT_URL",
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_SOCKET_URL",
  ])
    httpsOrigin(name);
  for (const name of [
    "MFA_ENCRYPTION_KEY",
    ...(includeBackups ? ["BACKUP_ENCRYPTION_KEY"] : []),
  ])
    if (!/^[a-f\d]{64}$/i.test(env[name] || ""))
      issues.push(name + " must be 32 random bytes encoded as hexadecimal");
  if (
    includeBackups &&
    env.MFA_ENCRYPTION_KEY &&
    env.MFA_ENCRYPTION_KEY === env.BACKUP_ENCRYPTION_KEY
  )
    issues.push("MFA and backups must use different keys");
  const mongo = env.MONGO_URI || "";
  if (
    !/^mongodb(?:\+srv)?:\/\/[^/@]+:[^/@]+@/.test(mongo) ||
    (!mongo.startsWith("mongodb+srv://") &&
      !/[?&](tls|ssl)=true(?:&|$)/i.test(mongo)) ||
    /[?&](tls|ssl)=false(?:&|$)/i.test(mongo) ||
    /[?&](tlsAllowInvalidCertificates|tlsAllowInvalidHostnames|tlsInsecure)=true(?:&|$)/i.test(
      mongo,
    )
  )
    issues.push("MONGO_URI must use authenticated MongoDB with verified TLS");
  if (!/^[1-9]\d?$/.test(env.TRUST_PROXY_HOPS || ""))
    issues.push("Set TRUST_PROXY_HOPS for the actual HTTPS proxy topology");
  for (const name of [
    "REQUIRE_EMAIL_VERIFICATION",
    "CHECK_BREACHED_PASSWORDS",
    "REQUIRE_BOT_PROTECTION",
  ])
    if (env[name] !== "true")
      issues.push(name + " must be enabled before public launch");
  for (const name of [
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "MAIL_FROM",
    "TURNSTILE_SECRET_KEY",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    ...(includeBackups ? ["BACKUP_DIRECTORY"] : []),
  ])
    requireValue(name);
  if (!["465", "587"].includes(env.SMTP_PORT || "587"))
    issues.push(
      "SMTP_PORT must use the configured TLS mail service (465 or 587)",
    );
  if (env.ADMIN_PASSWORD) issues.push("Remove ADMIN_PASSWORD after bootstrap");
  if (env.MIGRATION_MONGO_URI)
    issues.push(
      "Keep migration credentials out of the running application environment",
    );
  try {
    const u = new URL(env.SECURITY_CONTACT);
    if (
      !["mailto:", "https:"].includes(u.protocol) ||
      /[\r\n]/.test(env.SECURITY_CONTACT)
    )
      throw new Error();
  } catch {
    issues.push(
      "SECURITY_CONTACT must be a real mailto: or HTTPS disclosure contact",
    );
  }
  const expiry = Date.parse(env.SECURITY_EXPIRES);
  if (
    !Number.isFinite(expiry) ||
    expiry <= Date.now() ||
    expiry > Date.now() + 366 * 86400000
  )
    issues.push("SECURITY_EXPIRES must be a future date within one year");
  return issues;
}
module.exports = { productionIssues };
