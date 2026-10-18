# Security implementation and launch review

## Implemented controls

- Database-backed opaque sessions store only token hashes. Login rotates browser credentials; logout, permission changes, and account deletion revoke sessions and disconnect associated sockets. Cookies are HttpOnly, SameSite=Lax, Secure in production, and expire after eight hours.
- Passwords use bcrypt cost 12 with a minimum length of 12 and a 72-byte maximum. Password reset tokens and verification tokens are hashed, expire after 30 minutes, and are consumed once.
- Authenticator secrets use AES-256-GCM with a server-only key. Codes cannot be reused in the same time step. Resetting a password does not bypass enabled MFA.
- Passkeys require user verification, verify relying-party ID and origin, use expiring single-use challenges, and store public keys. Registration requires fresh password/MFA authentication.
- Authentication and role/membership authorization run on the server. Socket rooms derive identity from authenticated cookies; team joins are independently authorized. UUID public IDs are generated for new records; internal ObjectIds remain API identifiers and are protected by authorization, not obscurity.
- Strict writable-field schemas, literal regex escaping, query length/page caps, generic server errors, request-size limits, and per-IP/account limits.
- Exact CORS origin and server-side Origin checks for state-changing JSON requests. Authenticated responses use no-store.
- React text rendering, script/style nonce CSP, frame denial, Referrer-Policy, Permissions-Policy, nosniff, and production HSTS.
- Environment-only runtime secrets, ignored local environment files, pinned npm packages, lockfiles, Gitleaks hook/CI, CodeQL CI, dependency automation, and dependency audits.
- Login/admin/mutation/authorization-failure audit events omit bodies, emails, passwords, and tokens. Production database roles can grant insert-only access to the audit collection.
- Account/team deletion first disables access, then scheduled jobs purge associated data after 30 days. Notifications expire through a 90-day retention job.
- Backups can be encrypted with a separate AES-256-GCM key. Encryption/tamper rejection is tested; an actual production database backup and restore still requires operator verification.

## Configuration-dependent controls

- SMTP must be configured for verification and recovery mail. Mail jobs retry, capped at five attempts. Enable REQUIRE_EMAIL_VERIFICATION only after testing delivery.
- Set CHECK_BREACHED_PASSWORDS=true to enable the HIBP range check; only a SHA-1 prefix is transmitted. Provider failure rejects the password operation.
- Set backend TURNSTILE_SECRET_KEY and frontend NEXT_PUBLIC_TURNSTILE_SITE_KEY together; set REQUIRE_BOT_PROTECTION=true. Backend validates challenge success and hostname. The public site key is deliberately public. The widget is a vendor-managed dynamic script, not a static script with SRI.
- MFA_ENCRYPTION_KEY must be backed up securely and kept separate from the database. Losing it prevents existing authenticator secrets from being decrypted.
- Run migrations using separate credentials before starting production with the least-privilege application role. The role script grants insert-only audit writes, but storage-level immutability also requires external append-only retention.
- HTTPS termination, encrypted database/storage volumes, backup scheduling, WAF/DDoS protection, DNS CAA, SPF/DKIM/DMARC, PII-scrubbed monitoring, and required repository checks are not activated by source code alone.

## Known limitations / review before public launch

This project has not received an independent penetration test or ASVS Level 2 certification. No claim of compliance is made. Global super administrators intentionally have cross-team access. Reports approximate historical participation using current membership. No health-specific, payment, upload, mobile, or AI controls are applicable to the current product.

MFA recovery codes are not implemented: retain a secure authenticator backup or a separately registered passkey. Password-based sensitive actions still require a valid authenticator code when MFA is enabled.

Email response wording is generic and unknown-user password comparisons run bcrypt. Exact timing indistinguishability across database/provider conditions is not guaranteed. Mail delivery runs asynchronously to avoid exposing provider delivery time in account lookup responses.

Bot protection and email integrations must be tested with real provider credentials. Full backup/restore and least-privilege roles must be verified in the target environment. Container images must be pinned by digest and scanned in the deployment pipeline before release.

## Pre-launch test checklist

- [ ] Two unrelated members cannot read, search, write, resolve, or subscribe to each other's private teams.
- [ ] A removed/demoted user loses existing HTTP and socket access; sessions remain revoked after server restart.
- [ ] Concurrent submissions create one daily check-in, including at team-local midnight and daylight-saving changes.
- [ ] Forged, replayed, expired, and wrong-origin MFA/passkey/reset challenges fail.
- [ ] CSRF, operator injection, malformed IDs, large bodies, regex patterns, and pagination abuse are rejected.
- [ ] Production cookies/headers/CSP are inspected behind the actual HTTPS proxy.
- [ ] Turnstile and SMTP succeed and fail closed as expected; email links use the real HTTPS hostname.
- [ ] Background jobs recover after downtime without duplicate digests/notifications.
- [ ] Backup restores to an isolated database; counts, indexes, logins, sessions, and deletion retention are checked.
- [ ] Audit storage is append-only to the application identity; monitoring excludes PII and secrets.
- [ ] Secret/dependency/SAST checks pass and remote protections block unreviewed/high-severity changes.
- [ ] Independent OWASP Top 10 / ASVS Level 2 assessment is completed and recorded.

## Secret incident response

1. Assign an incident owner and record discovery time, impacted systems, evidence, and containment decisions without copying secret values.
2. Revoke the exposed credential at its provider first. Invalidate sessions if session material or database access was exposed; disable affected integrations if scope is uncertain.
3. Replace the credential in the server secret store, restart affected services, and verify access with the new credential.
4. Coordinate a repository freeze and backup before history rewriting. In a disposable mirror clone use git filter-repo --path PATH_TO_SECRET --invert-paths (or reviewed replacement rules), or BFG with a reviewed replacement file. Review the rewritten history with Gitleaks. Force-pushing requires explicit repository-owner approval and coordination with collaborators; old clones/caches must be handled too.
5. Assess access logs and impacted people/data. The incident owner should obtain jurisdiction-specific advice on applicable notification obligations; this repository does not prescribe legal deadlines.
6. Record remediation, restore availability, and add a regression test/prevention rule.

Review credentials quarterly and rotate on staff/access changes or suspected exposure. MFA encryption-key rotation requires decrypting/re-encrypting existing secrets under controlled migration; do not simply replace the key and strand users.

Before publishing, set a real security contact and serve /.well-known/security.txt with a current expiry. No contact address is invented in this repository.

## References

- [OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP NoSQL security](https://cheatsheetseries.owasp.org/cheatsheets/NoSQL_Security_Cheat_Sheet.html)
- [SimpleWebAuthn server documentation](https://simplewebauthn.dev/docs/packages/server)
- [Cloudflare Turnstile verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
