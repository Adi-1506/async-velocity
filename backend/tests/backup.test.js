const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs/promises"),
  os = require("os"),
  path = require("path"),
  crypto = require("crypto"),
  { Readable } = require("stream");
const { encryptStream, decryptFile } = require("../lib/backup");
test("encrypted archives round-trip and tampering fails closed", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "standup-backup-test-")),
    encrypted = path.join(dir, "backup.enc"),
    restored = path.join(dir, "restored"),
    bad = path.join(dir, "bad"),
    key = crypto.randomBytes(32).toString("hex"),
    payload = crypto.randomBytes(1024);
  try {
    await encryptStream(Readable.from([payload]), encrypted, key);
    await decryptFile(encrypted, restored, key);
    assert.deepEqual(await fs.readFile(restored), payload);
    const bytes = await fs.readFile(encrypted);
    bytes[25] ^= 1;
    await fs.writeFile(encrypted, bytes);
    await assert.rejects(decryptFile(encrypted, bad, key));
    await assert.rejects(fs.access(bad));
  } finally {
    for (const f of [encrypted, restored, bad])
      await fs.unlink(f).catch(() => {});
    await fs.rmdir(dir);
  }
});
