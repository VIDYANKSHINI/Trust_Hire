import crypto from "crypto";

function getKey(): Buffer {
  const encKeyBase64 = process.env.DATA_ENC_KEY;
  if (!encKeyBase64) {
    throw new Error("DATA_ENC_KEY environment variable is missing");
  }
  const key = Buffer.from(encKeyBase64, "base64");
  if (key.length !== 32) {
    throw new Error(`DATA_ENC_KEY must be exactly 32 bytes (got ${key.length})`);
  }
  return key;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Output format: base64(iv).base64(ciphertext).base64(tag)
 */
export function encrypt(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // Standard 12-byte IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${ciphertext.toString("base64")}.${tag.toString("base64")}`;
}

/**
 * Decrypts AES-256-GCM string in format: base64(iv).base64(ciphertext).base64(tag)
 */
export function decrypt(enc: string): string {
  const key = getKey();
  const parts = enc.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format: must have iv.ciphertext.tag");
  }

  const iv = Buffer.from(parts[0], "base64");
  const ciphertext = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
