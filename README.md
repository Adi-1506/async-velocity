# StandupBot

A web-only asynchronous standup workspace built with Next.js, Express, and MongoDB.

## What works

- Member registration and sign-in; administrator and super-administrator permissions.
- Revocable eight-hour server sessions, logout everywhere, password changes, authenticator MFA, and passkeys.
- Multiple teams, member management, team-local check-ins, history, literal-text search, and authenticated live updates.
- Blocker resolution, date-range insights, notifications, and daily/weekly digests.
- Time-zone-aware working-day schedules, bounded restart catch-up, and database-enforced deduplication.
- Email verification and password recovery through a retryable mail queue when SMTP is configured.
- Personal-data export and account deletion with a 30-day purge window.
- Input validation, origin/CSRF checks, shared database-backed rate limits, secure cookies, nonce CSP, security headers, audit events, optional Turnstile, and breached-password checks.

This is a local application, not a deployed service. Read [SECURITY.md](SECURITY.md) and [OPERATIONS.md](OPERATIONS.md) before public deployment.

## Local setup

Use Node.js 22 or newer and MongoDB. Production should use authenticated MongoDB with TLS and separate application/migration credentials.

1. In `backend`, run `npm ci --ignore-scripts`. Copy `.env.example` to `.env` only if no local environment file exists.
2. Set `MONGO_URI`. Generate `MFA_ENCRYPTION_KEY` with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and store the result only in the backend environment.
3. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of at least 12 characters. Run `npm run bootstrap` once, then remove `ADMIN_PASSWORD`. Bootstrap refuses to overwrite existing users or an existing super administrator.
4. Run `npm run migrate`, then `npm run dev` in `backend`.
5. In `frontend`, run `npm ci --ignore-scripts`. Copy `.env.example` to `.env.local` if needed, and run `npm run dev`.
6. Open `http://localhost:3000/admin/login`, create a team, and add registered members by email. Members register at `/register`.

Existing development environment files were preserved. Legacy scripts that deleted collections or seeded known passwords are disabled. Never reuse old demonstration accounts/passwords in production.

## Commands

| Directory | Command | Purpose |
|---|---|---|
| backend | npm run dev | API with Node's built-in file watcher |
| backend | npm start | API and background scheduler |
| backend | npm run bootstrap | Create the first super administrator |
| backend | npm run migrate | Create collections and additive indexes |
| backend | npm test | Isolated API/security and backup-encryption tests |
| frontend | npm run dev | Frontend development server |
| frontend | npm run lint | TypeScript and React Hooks lint |
| frontend | npm run typecheck | Type checking |
| frontend | npm run build | Production build |
| frontend | npm run test:e2e | Production browser workflow using an isolated database |

Browser tests use installed Edge on Windows and Playwright Chromium on Linux. On Linux, install the browser with `npx --no-install playwright install --with-deps chromium`. Tests use ports 5055 and 3100, never the configured application database. The database test helper may download a MongoDB binary on first use.

## Product boundaries

Participation reports use current team membership and configured workdays; historical membership changes are not reconstructed. Team selection currently loads up to 100 teams; larger deployments need paginated team selection. Daily/weekly digests catch up completed periods within the previous seven days. SMTP, Turnstile, production backups, monitoring, DNS, and hosting require operator configuration. There is no Slack/Teams integration, billing, health-data workflow, upload service, or AI integration.

## Repository

Git tracks both application folders and the root workflow/configuration files. Local environment files, generated output, dependencies, and transcript scratch files are excluded from version control.

The local pre-commit hook runs Gitleaks. CI definitions perform dependency checks, tests, production builds, browser tests, secret scanning, and CodeQL analysis once committed to a compatible GitHub repository. Remote branch protection and required checks must be enabled separately.
