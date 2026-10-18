const fs = require("fs"),
  fsp = require("fs/promises"),
  crypto = require("crypto");
const { pipeline } = require("stream/promises");
function key(value) {
  if (!/^[a-f0-9]{64}$/i.test(value || ""))
    throw new Error(
      "Set BACKUP_ENCRYPTION_KEY to a separate 32-byte hexadecimal key",
    );
  return Buffer.from(value, "hex");
}
async function encryptStream(source, target, secret) {
  const iv = crypto.randomBytes(12),
    cipher = crypto.createCipheriv("aes-256-gcm", key(secret), iv);
  await fsp.writeFile(target, Buffer.concat([Buffer.from("STBK1"), iv]), {
    flag: "wx",
    mode: 0o600,
  });
  try {
    await pipeline(
      source,
      cipher,
      fs.createWriteStream(target, { flags: "a" }),
    );
    await fsp.appendFile(target, cipher.getAuthTag());
  } catch (e) {
    await fsp.unlink(target).catch(() => {});
    throw e;
  }
}
async function decryptFile(source, target, secret) {
  const info = await fsp.stat(source);
  if (info.size < 33) throw new Error("Invalid backup");
  const handle = await fsp.open(source, "r");
  const header = Buffer.alloc(17),
    tag = Buffer.alloc(16);
  try {
    await handle.read(header, 0, 17, 0);
    await handle.read(tag, 0, 16, info.size - 16);
  } finally {
    await handle.close();
  }
  if (header.subarray(0, 5).toString() !== "STBK1")
    throw new Error("Invalid backup");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(secret),
    header.subarray(5),
  );
  decipher.setAuthTag(tag);
  let created = false;
  try {
    const out = await fsp.open(target, "wx", 0o600);
    created = true;
    await out.close();
    await pipeline(
      fs.createReadStream(source, { start: 17, end: info.size - 17 }),
      decipher,
      fs.createWriteStream(target, { flags: "w" }),
    );
  } catch (e) {
    if (created) await fsp.unlink(target).catch(() => {});
    throw e;
  }
}
module.exports = { encryptStream, decryptFile };
