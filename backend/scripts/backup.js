require("dotenv").config();
const fs = require("fs/promises"),
  path = require("path"),
  os = require("os"),
  { spawn } = require("child_process");
const { encryptStream, decryptFile } = require("../lib/backup");
async function run() {
  const restore = process.argv[2] === "restore";
  if (restore && process.env.RESTORE_CONFIRM !== "RESTORE_TO_ISOLATED_DATABASE")
    throw new Error(
      "Set RESTORE_CONFIRM=RESTORE_TO_ISOLATED_DATABASE and RESTORE_MONGO_URI to a disposable restore database",
    );
  const uri = restore ? process.env.RESTORE_MONGO_URI : process.env.MONGO_URI;
  if (!uri) throw new Error("Database URI is required");
  if (restore && uri === process.env.MONGO_URI)
    throw new Error("Restoring over the application database is refused");
  if (!/^[a-fA-F0-9]{64}$/.test(process.env.BACKUP_ENCRYPTION_KEY || ""))
    throw new Error("A 32-byte backup encryption key is required");
  if (!restore) {
    if (!process.env.BACKUP_DIRECTORY)
      throw new Error("Set BACKUP_DIRECTORY to a private, backed-up directory");
    await fs.mkdir(process.env.BACKUP_DIRECTORY, { recursive: true });
  }
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "standup-backup-")),
    config = path.join(temporary, "config.yml"),
    plain = path.join(temporary, "restore.archive");
  try {
    await fs.writeFile(config, "uri: " + JSON.stringify(uri) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    if (restore) {
      if (!process.argv[3])
        throw new Error("Provide the encrypted backup path");
      await decryptFile(
        path.resolve(process.argv[3]),
        plain,
        process.env.BACKUP_ENCRYPTION_KEY,
      );
    }
    const sourceName = process.env.BACKUP_DB_NAME,
      targetName = process.env.RESTORE_DB_NAME;
    if (
      restore &&
      (!/^[A-Za-z0-9_-]+$/.test(sourceName || "") ||
        !/^[A-Za-z0-9_-]+$/.test(targetName || "") ||
        sourceName === targetName)
    )
      throw new Error("Set distinct BACKUP_DB_NAME and RESTORE_DB_NAME");
    const args = [
      "--config",
      config,
      "--gzip",
      ...(restore
        ? [
            "--archive=" + plain,
            "--nsInclude=" + sourceName + ".*",
            "--nsFrom=" + sourceName + ".*",
            "--nsTo=" + targetName + ".*",
          ]
        : ["--archive"]),
    ];
    const child = spawn(restore ? "mongorestore" : "mongodump", args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stderr.resume();
    const completion = new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error("Database backup tool failed")),
      );
    });
    if (restore) {
      child.stdout.resume();
      await completion;
      console.log(
        "Restore completed in the isolated target. Verify counts and application tests before approving recovery.",
      );
    } else {
      const target = path.resolve(
        process.env.BACKUP_DIRECTORY,
        "standup-" + new Date().toISOString().replace(/[:.]/g, "-") + ".enc",
      );
      try {
        await Promise.all([
          completion,
          encryptStream(
            child.stdout,
            target,
            process.env.BACKUP_ENCRYPTION_KEY,
          ),
        ]);
      } catch (e) {
        child.kill();
        await fs.unlink(target).catch(() => {});
        throw e;
      }
      console.log("Encrypted backup written.");
    }
  } finally {
    await fs.unlink(config).catch(() => {});
    await fs.unlink(plain).catch(() => {});
    await fs.rmdir(temporary).catch(() => {});
  }
}
run().catch(() => {
  console.error(
    "Backup/restore failed. Check configuration, tools, key, and database access. No credentials are logged.",
  );
  process.exitCode = 1;
});
