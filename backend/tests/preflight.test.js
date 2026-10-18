const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("crypto");
const { productionIssues } = require("../lib/preflight");
const valid = () => ({
  NODE_ENV: "production",
  CLIENT_URL: "https://app.example.test",
  NEXT_PUBLIC_API_URL: "https://api.example.test",
  NEXT_PUBLIC_SOCKET_URL: "https://api.example.test",
  MFA_ENCRYPTION_KEY: crypto.randomBytes(32).toString("hex"),
  BACKUP_ENCRYPTION_KEY: crypto.randomBytes(32).toString("hex"),
  MONGO_URI: "mongodb+srv://fixture:fixture@db.example.test/app",
  TRUST_PROXY_HOPS: "1",
  REQUIRE_EMAIL_VERIFICATION: "true",
  CHECK_BREACHED_PASSWORDS: "true",
  REQUIRE_BOT_PROTECTION: "true",
  SMTP_HOST: "smtp.example.test",
  SMTP_USER: "fixture",
  SMTP_PASSWORD: "fixture",
  MAIL_FROM: "app@example.test",
  TURNSTILE_SECRET_KEY: "fixture",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "fixture",
  BACKUP_DIRECTORY: "/private/backup",
  SECURITY_CONTACT: "mailto:security@example.test",
  SECURITY_EXPIRES: new Date(Date.now() + 86400000 * 180).toISOString(),
});
test("production preflight rejects insecure and missing configuration without revealing values", () => {
  assert.deepEqual(productionIssues(valid()), []);
  for (const fields of [
    { CLIENT_URL: "http://localhost:3000" },
    { MONGO_URI: "mongodb://db/app" },
    { MONGO_URI: "mongodb+srv://fixture:fixture@db/app?tls=false" },
    { MONGO_URI: "mongodb+srv://fixture:fixture@db/app?tlsInsecure=true" },
    { REQUIRE_BOT_PROTECTION: "false" },
    { SECURITY_CONTACT: "mailto:contact@example.test\nInjected: value" },
    { SECURITY_EXPIRES: "2000-01-01" },
    { ADMIN_PASSWORD: "private-bootstrap-value" },
    { MIGRATION_MONGO_URI: "private-migration-value" },
  ]) {
    const result = productionIssues({ ...valid(), ...fields });
    assert.ok(result.length > 0);
    assert.ok(!JSON.stringify(result).includes("private-"));
  }
  const reused = valid();
  reused.BACKUP_ENCRYPTION_KEY = reused.MFA_ENCRYPTION_KEY;
  assert.ok(
    productionIssues(reused).some((issue) => issue.includes("different keys")),
  );
});
