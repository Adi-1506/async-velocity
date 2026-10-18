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
9. Build/run the frontend. Dockerfiles are provided but have not been built here because Docker is unavailable. Pin base image digests and scan images before deployment.
10. Configure log collection, PII-scrubbed alerting, uptime checks, WAF/DDoS controls, DNS/email records, and a real vulnerability disclosure contact.

The /health endpoint exposes only database connection readiness. Add external checks for backup age, mail retries, scheduler failures, and audit-write failures.

## Backups

Install MongoDB Database Tools on the backup host. Use a backup-specific database credential and a private BACKUP_DIRECTORY. Generate a separate BACKUP_ENCRYPTION_KEY and keep it in a secret manager with access distinct from storage access.

Run npm run backup from backend. Schedule this command daily using the hosting scheduler; keep 30 daily encrypted copies and replicate to a separate protected location. Define and monitor an initial RPO of 24 hours and an RTO of 4 hours; these are targets until a restore drill demonstrates them.

The script passes database connection settings through a temporary restricted config file, not command-line credentials. Encryption uses authenticated AES-256-GCM. Backups should run against a consistent snapshot or while application writes are paused; the generic mongodump command is not a cross-collection point-in-time snapshot.

For a restore drill, set RESTORE_MONGO_URI to a disposable target and BACKUP_DB_NAME / RESTORE_DB_NAME to distinct source and target database names. Set RESTORE_CONFIRM=RESTORE_TO_ISOLATED_DATABASE. Run npm run restore -- PATH_TO_ENCRYPTED_BACKUP. Never point it at the application database. Inspect restored collection counts/indexes and run an isolated application verification before considering recovery approved.

The encryption helper has an automated round-trip/tamper test. A real mongodump/mongorestore drill has not been run here; production backups are not configured or scheduled.

## Git and CI

The repository root now covers both applications. No files have been staged, committed, or pushed. Review the move from the previous frontend-only layout before the first project-wide commit.

The local hook runs Gitleaks from PATH or the checksum-verified local Windows scanner in .tools/gitleaks. CI uses its own pinned scanner. .tools and environment files remain ignored. Configure required Verify/CodeQL checks, protected branches, reviews, and signing policies in the remote host; workflows alone do not configure those policies. Private repositories may require additional CodeQL entitlement.

## Retention and recovery

Account deletion disables login immediately and removes team membership; data is purged after 30 days. The last super administrator cannot delete their account. Teams owned by an account must be archived before deletion. Team archives become inaccessible immediately and are purged after 30 days. Notifications are retained for 90 days. Audit retention is an operator policy and must be configured in the append-only destination.

Deployments should preserve the MFA encryption key across restarts. Sessions are stored in MongoDB and can be revoked independently. Legacy JWT cookies are intentionally rejected after this upgrade, so existing users must sign in again.
