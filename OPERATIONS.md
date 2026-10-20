# Operations

## Production setup

1. Choose a domain, HTTPS reverse proxy, application host, authenticated TLS-enabled MongoDB, SMTP provider, and backup destination. Use separate dev/staging/production databases and keys.
2. Build the frontend with its final NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SOCKET_URL. These are compiled public values, not secrets. Prefer the frontend and API on the same site (for example app.example.com and api.example.com) so SameSite cookies work.
3. Configure backend CLIENT_URL to exactly the frontend origin with no trailing slash. Set NODE_ENV=production, a strong MFA_ENCRYPTION_KEY, and MONGO_URI with the database application credential. Set TRUST_PROXY_HOPS only to the exact known proxy topology. The API refuses insecure production requests.
4. Run npm run migrate using MIGRATION_MONGO_URI with provisioning privileges. The migration creates collections/indexes without deleting data. Resolve old duplicate-index conflicts explicitly; never auto-delete records to make an index succeed.
5. Have a database administrator run deployment/mongo-roles.js to provision a least-privilege application identity. Runtime production disables automatic index/collection creation.
6. Bootstrap the first administrator once with server-side ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD, then remove the bootstrap password.
7. Configure SMTP and verify/reset delivery; enable email verification and breached-password checks. Configure Turnstile's server key and public site key together.
8. Run the API with a process supervisor. It starts the reminder, digest, mail, and retention scheduler. MongoDB unique keys deduplicate work across retries. The current deployment should use one API/socket instance; multiple socket instances need an adapter for cross-instance broadcasts and revocation.
9. Build/run the frontend. Container base images are pinned by digest; the Containers workflow builds and scans both images. Docker is unavailable on the local workstation; verify the workflow results before deployment.
10. Configure log collection, PII-scrubbed alerting, uptime checks, WAF/DDoS controls, DNS/email records, and a real vulnerability disclosure contact.

The /health endpoint exposes only database connection readiness. Add external checks for backup age, mail retries, scheduler failures, and audit-write failures.

## Backups

Install MongoDB Database Tools on the backup host. Use a backup-specific database credential and a private BACKUP_DIRECTORY. Generate a separate BACKUP_ENCRYPTION_KEY and keep it in a secret manager with access distinct from storage access.

Run npm run backup from backend. Schedule this command daily using the hosting scheduler; keep 30 daily encrypted copies and replicate to a separate protected location. Define and monitor an initial RPO of 24 hours and an RTO of 4 hours; these are targets until a restore drill demonstrates them.

The script passes database connection settings through a temporary restricted config file, not command-line credentials. Encryption uses authenticated AES-256-GCM. Backups should run against a consistent snapshot or while application writes are paused; the generic mongodump command is not a cross-collection point-in-time snapshot.

For a restore drill, set RESTORE_MONGO_URI to a disposable target and BACKUP_DB_NAME / RESTORE_DB_NAME to distinct source and target database names. Set RESTORE_CONFIRM=RESTORE_TO_ISOLATED_DATABASE. Run npm run restore -- PATH_TO_ENCRYPTED_BACKUP. Never point it at the application database. Inspect restored collection counts/indexes and run an isolated application verification before considering recovery approved.

The encrypted mongodump/mongorestore drill has passed against disposable local databases, checking collection counts, unique indexes, login and team access. Run `npm run test:restore` with development dependencies and MongoDB Database Tools on PATH to repeat it. CI also runs this drill using checksum-verified tools. Production backup credentials, scheduling, replication and restore timing still require the real environment.

The Linux `deployment/standup-backup.service` and `.timer` templates schedule daily backups. Provision the service user, `/opt/async-velocity`, a private `/var/lib/async-velocity/backups` directory, and a root-owned `/etc/async-velocity/backup.env` readable by the service user. Put the backup-specific MONGO_URI, BACKUP_DIRECTORY, and separate BACKUP_ENCRYPTION_KEY there. Install Node and MongoDB Database Tools, review the paths, then install/enable the timer. Configure external failure alerts and storage lifecycle rules for 30 daily copies; the template deliberately does not delete archives automatically. Keep this credential/key separate from the application runtime.

## Git and CI

The repository root covers both applications. The repaired implementation was published to `Adi-1506/async-velocity` while retaining the previous GitHub history. Public commits use the owner's GitHub no-reply address.

The local hook runs Gitleaks from PATH or the checksum-verified local Windows scanner in .tools/gitleaks. CI uses its own pinned scanner. .tools and environment files remain ignored. Configure required Verify/CodeQL checks, protected branches, reviews, and signing policies in the remote host; workflows alone do not configure those policies. Private repositories may require additional CodeQL entitlement.

## Retention and recovery

Account deletion disables login immediately and removes team membership; data is purged after 30 days. The last super administrator cannot delete their account. Teams owned by an account must be archived before deletion. Team archives become inaccessible immediately and are purged after 30 days. Notifications are retained for 90 days. Audit retention is an operator policy and must be configured in the append-only destination.

Deployments should preserve the MFA encryption key across restarts. Sessions are stored in MongoDB and can be revoked independently. Legacy JWT cookies are intentionally rejected after this upgrade, so existing users must sign in again.

Users can generate ten one-time MFA recovery codes in Account after password/authenticator confirmation. Only hashes are stored. Recovery requires the account password and one code, removes authenticator MFA, revokes every session and invalidates the entire old recovery set. Users must sign in and re-enroll MFA afterwards. Passkeys can be listed and removed in Account; removal requires fresh authentication and signs out every device.

## Add services later

Local development needs no domain, hosting subscription or email-delivery account. Keep optional provider settings disabled locally; reset/verification delivery becomes usable when SMTP is configured. Do not enable required email verification before delivery works.

When ready, copy `deployment/.env.example` to `deployment/.env` on your host and fill the placeholders. The Compose template uses one domain for the frontend, API and sockets. Set CLIENT_URL, NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SOCKET_URL to the same HTTPS origin. Set APP_DOMAIN to the hostname without a scheme. DNS must point at the host; ports 80/443 must reach Caddy. Caddy obtains certificates and redirects HTTP to HTTPS. Only Caddy publishes network ports; TRUST_PROXY_HOPS=1 assumes this direct topology. Adding another proxy requires review.

Run migrations and administrator bootstrap separately with provisioning credentials; do not put migration credentials or the bootstrap password in the running service environment. From `deployment`, run `docker compose --env-file .env -f compose.yml up --build -d` after reviewing configuration. This will incur costs only on infrastructure you provision; this task has not created any hosting resources.

The API container runs `preflight --app-only` before startup, rejecting missing HTTPS, authenticated database TLS, mail, bot protection, MFA encryption and disclosure configuration. For a complete host-side check including backup settings, run `npm run preflight` in backend with both frontend/server and backup configuration supplied in the environment. This checks configuration, not provider connectivity or operational readiness.

Application runtime containers use pinned non-root distroless Node images without a shell or package manager. Use `docker compose exec backend /nodejs/bin/node scripts/migrate.js` only with separately provided provisioning credentials; shell-based container commands will not work. Prefer running migrations and backup tooling in a separate administrative environment. Container CI checks native password hashing and frontend HTTP startup as well as vulnerabilities.

Set SECURITY_CONTACT to your actual `mailto:` address or HTTPS disclosure page and SECURITY_EXPIRES to an ISO date within the next year in the frontend runtime. `/.well-known/security.txt` returns 404 until valid values are configured. Renew it before expiry.

Before launch, verify real SMTP and Turnstile, database roles/encryption, DNS/email authentication, WAF/DDoS protection, monitored backups and PII-scrubbed error alerts. Arrange independent security testing and assign an incident owner. These remain external setup tasks, not completed by the templates.

References: [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https), [MongoDB Database Tools installation](https://www.mongodb.com/docs/database-tools/installation/).
