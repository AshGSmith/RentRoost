import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function getKeyMaterial() {
  const secret = process.env.BANK_PROVIDER_ENCRYPTION_KEY || process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("BANK_PROVIDER_ENCRYPTION_KEY or SESSION_SECRET is required.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const key = getKeyMaterial();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string) {
  const key = getKeyMaterial();
  const buffer = Buffer.from(payload, "base64");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
