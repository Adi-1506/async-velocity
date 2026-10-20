# Requested security requirements: implementation status

This is a web-only team standup application using MongoDB, not a health app or Supabase application. The original checklist is assessed below against that scope. “Implemented” describes source behavior, not production certification. “Partial” includes controls that need deployment configuration or further work. A passing dependency scan is a point-in-time result.

| # | Requirement | Status and evidence / remaining work |
|---|---|---|
| 1 | Server-only secrets | Implemented: environment configuration; public frontend variables are endpoint/site-key configuration. Source scans pass. |
| 2 | Git secret prevention | Partial: ignore rules, Gitleaks hook and CI, incident/history-cleanup instructions. CI becomes active after publication; hooks need Gitleaks installed. |
| 3 | Public DB key only in client | Not applicable: no client database connection or Supabase keys. |
| 4 | SQL row-level security | Not applicable literally: MongoDB. Server membership/ownership checks and cross-team tests provide application authorization; this is not database-enforced RLS. |
| 5 | Encryption | Partial: MFA secrets and backup archives encrypted. Production TLS and encrypted database/storage must be configured. No health/photo data exists. |
| 6 | Server authentication | Implemented for private routes and sockets; login, registration, and recovery are intentionally public. |
| 7 | Record authorization and UUIDs | Partial: ownership/team checks tested; public UUIDs generated, but APIs still use internal ObjectIds. |
| 8 | Writable field allowlists | Implemented: strict request schemas; role changes use authorized administrative routes. |
| 9 | Session cookies | Partial: HttpOnly, SameSite=Lax, Secure in production, eight-hour expiry, login rotation and server revocation. No periodic refresh/idle-session rotation. |
| 10 | Password and recovery security | Partial: bcrypt, hashed single-use expiring tokens, verification and TOTP implemented. Real email delivery remains unconfigured. |
| 11 | Rate limits | Implemented: shared database counters and IP/account limits. Production thresholds require load testing. |
| 12 | Bot protection | Partial: optional Turnstile and honeypots on authentication forms. Provider keys and integration testing required; password reset and MFA recovery are also protected. |
| 13 | Parameterized queries | Implemented equivalent: structured Mongoose queries, validated inputs and escaped literal search; no SQL. |
| 14 | Input validation | Partial: server schemas and client form validation implemented; full schema parity for every client form is not claimed. |
| 15 | Output encoding | Implemented: user content rendered as React text; no rich-text input feature. |
| 16 | Upload restrictions | Not applicable: no file upload endpoint. |
| 17 | Minimal responses | Partial: authentication secrets excluded and generic server errors; internal ObjectIds remain present. |
| 18 | Headers and CORS | Implemented in application configuration; inspect actual deployed responses before launch. |
| 19 | HTTPS enforcement | Partial: production backend requires HTTPS, Secure cookies and HSTS configured. Edge redirects and preload submission require hosting/domain configuration. |
| 20 | Dependency scanning | Implemented configuration: pinned versions, lockfiles, npm audit and Dependabot. Current audits report zero known vulnerabilities. |
| 21 | CSRF | Implemented: allowed Origin plus JSON checks on state changes and SameSite cookies. |
| 22 | Enumeration resistance | Partial: generic wording, unknown-user password hashing and asynchronous mail. Exact timing equivalence is not guaranteed. |
| 23 | MFA, passkeys, breached passwords | Partial: TOTP/passkeys and 12-character minimum implemented. Hashed one-time recovery codes implemented. Breached-password check must be enabled. |
| 24 | Session management | Implemented: session listing/revocation, password-change invalidation and reauthentication for sensitive account actions. |
| 25 | Redirect allowlist | Implemented by fixed application navigation; no arbitrary post-login redirect target accepted. |
| 26 | Token comparisons and lifecycle | Implemented: hashed random recovery/session tokens, expiring single-use challenges; cryptographic verification delegated to established libraries. |
| 27 | SSRF | Not applicable to URL importing: no importer or arbitrary URL fetch. Existing provider calls use fixed service URLs. |
| 28 | Least-privilege database roles | Partial: role/migration scripts provided; roles must be applied and tested on the target database. |
| 29 | Query limits | Implemented for user-facing lists/search with bounded pages and search time limits; background administrative jobs need production sizing. |
| 30 | Backup and retention | Partial: encrypted backup/isolated restore tooling and deletion retention implemented. Daily scheduling template and disposable-database restore drill supplied; real hosting setup and production drill outstanding. |
| 31 | Audit logs | Partial: authentication/mutation/permission events omit sensitive payloads. Insert-only database role provided; external immutable storage not configured. |
| 32 | Webhook verification | Not applicable: no webhook integrations. |
| 33 | Payment idempotency | Not applicable: no payment/subscription processing. |
| 34 | Strict CORS | Implemented: one explicit configured browser origin, no wildcard credentials. |
| 35 | AI trust boundaries | Not applicable: no AI features or model calls. |
| 36 | AI quotas | Not applicable: no AI/photo/OCR endpoints. |
| 37 | AI privacy | Not applicable: no third-party AI data processing. |
| 38 | Nonce CSP, SRI, analytics consent | Partial: nonce CSP and no analytics. Optional Turnstile is a vendor-managed dynamic script without static SRI. |
| 39 | Personal-data caching | Implemented for current app: no service worker, no-store private responses, logout clears stored team selection/session storage. |
| 40 | Native token storage | Not applicable: web-only. |
| 41 | Clickjacking and no-store | Implemented in headers/CSP; verify at production edge. |
| 42 | Supply-chain installation | Partial: exact dependencies, lockfiles and CI npm ci with scripts disabled. Full provenance enforcement not configured. |
| 43 | SAST and secret scanning | Partial: CodeQL/Gitleaks workflows provided. Container build/scanning workflow added; remote merge blocking outstanding. |
| 44 | Repository/environment protections | Outstanding: remote branch rules, required reviews, signed commits and separate deployed environments require owner/platform setup. |
| 45 | Rotation and incidents | Documented in SECURITY.md; operational ownership and notification procedures must be assigned before launch. |
| 46 | WAF, DNS and disclosure | Outstanding: no provider/domain/security contact supplied. Configurable security.txt handler implemented. |
| 47 | Error monitoring | Outstanding: no monitoring service configured. Existing server errors avoid sensitive payloads. |
| 48 | OWASP assessment | Partial: pre-launch checklist and authorization/security regression tests supplied. Independent ASVS Level 2 assessment not performed. |
| 49 | Health safety | Not applicable: no calorie, weight-loss, or medical advice functionality. |
| 50 | Minor weight-loss restrictions | Not applicable: no weight-loss functionality. Any broader age policy remains a product/legal decision. |

## Local validation

- Backend: 21 tests pass, including authorization, sessions, input tampering, MFA replay/recovery, sockets, scheduler deduplication, tokens, rate limits, passkey management, local SMTP delivery, and encrypted archive tampering.
- Browser: production-build workflow passes for member/admin usage and virtual-authenticator passkey enrollment/login; mobile viewport checked.
- Frontend lint, type checking and production build pass.
- Backend and frontend dependency audits report zero known vulnerabilities.
- Gitleaks source and available Git history scans pass. Local environment files and generated dependencies are excluded from the source scan; this does not certify deployed secrets or external repositories.
- Live SMTP, Turnstile, production HTTPS/database roles and production backups remain unverified. A real encrypted dump/restore of disposable databases passed locally; container execution is checked by CI.

See [SECURITY.md](SECURITY.md) and [OPERATIONS.md](OPERATIONS.md) for launch requirements and procedures. Repository publication does not deploy the application or activate external production services.
