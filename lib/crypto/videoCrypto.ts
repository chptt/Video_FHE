/**
 * CipherStream Video Encryption Utilities
 *
 * Uses the Web Crypto API (AES-GCM, 256-bit key) for client-side
 * encryption and decryption of video files.
 *
 * Encryption format:
 *   [ 12-byte IV ][ encrypted ciphertext ]
 *
 * The IV is prepended to the encrypted blob so it can be stored
 * alongside the ciphertext on IPFS without a separate record.
 *
 * Key Management (MVP):
 *   Keys are exported as Base64 strings and stored in a server-side
 *   demo registry (see /api/key/register). This is NOT production-safe.
 *
 * TODO (production): Replace with one of:
 *   - Lit Protocol threshold encryption (recommended)
 *   - ECIES wallet-based encryption (encrypt key with viewer's public key)
 *   - TEE-based key management (e.g., Phala Network)
 *   - FHE for private access tiers (e.g., Zama TFHE)
 */

const AES_ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // bytes

// =========================================================
// Key generation & serialization
// =========================================================

/**
 * Generate a new AES-GCM 256-bit key.
 */
export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: KEY_LENGTH },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Export a CryptoKey to a Base64-encoded string for storage.
 */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(raw);
}

/**
 * Import a Base64-encoded key string back to a CryptoKey.
 */
export async function importKeyFromBase64(base64Key: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: AES_ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );
}

// =========================================================
// Encryption
// =========================================================

export interface EncryptionResult {
  encryptedBlob: Blob;
  iv: Uint8Array;
  key: CryptoKey;
  keyBase64: string;
}

/**
 * Encrypt a File using AES-GCM.
 * Returns an encrypted Blob with the IV prepended (first 12 bytes).
 *
 * @param file  The video file to encrypt.
 * @param key   Optional existing CryptoKey. A new key is generated if omitted.
 * @param onProgress  Optional progress callback (0–100).
 */
export async function encryptFile(
  file: File,
  key?: CryptoKey,
  onProgress?: (pct: number) => void
): Promise<EncryptionResult> {
  onProgress?.(5);

  const aesKey = key ?? (await generateAesKey());
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  onProgress?.(10);

  const fileBuffer = await file.arrayBuffer();
  onProgress?.(40);

  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    aesKey,
    fileBuffer
  );
  onProgress?.(90);

  // Prepend IV to ciphertext
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);

  const encryptedBlob = new Blob([combined], {
    type: "application/octet-stream",
  });

  const keyBase64 = await exportKeyToBase64(aesKey);
  onProgress?.(100);

  return { encryptedBlob, iv, key: aesKey, keyBase64 };
}

// =========================================================
// Decryption
// =========================================================

export interface DecryptionResult {
  decryptedBlob: Blob;
  mimeType: string;
}

/**
 * Decrypt an encrypted video blob using AES-GCM.
 * Expects the first 12 bytes to be the IV.
 *
 * @param encryptedBlob  The encrypted blob (IV + ciphertext).
 * @param keyBase64      Base64-encoded AES key.
 * @param mimeType       MIME type to assign to the decrypted blob.
 * @param onProgress     Optional progress callback (0–100).
 */
export async function decryptFile(
  encryptedBlob: Blob,
  keyBase64: string,
  mimeType = "video/mp4",
  onProgress?: (pct: number) => void
): Promise<DecryptionResult> {
  onProgress?.(5);

  const key = await importKeyFromBase64(keyBase64);
  onProgress?.(15);

  const buffer = await encryptedBlob.arrayBuffer();
  const combined = new Uint8Array(buffer);

  // Extract IV (first 12 bytes) and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  onProgress?.(30);

  const decrypted = await crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv },
    key,
    ciphertext
  );
  onProgress?.(95);

  const decryptedBlob = new Blob([decrypted], { type: mimeType });
  onProgress?.(100);

  return { decryptedBlob, mimeType };
}

// =========================================================
// Helpers
// =========================================================

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Create an object URL from a Blob and return it.
 * Remember to call URL.revokeObjectURL() when done.
 */
export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Detect MIME type from a CID filename or fallback.
 */
export function detectMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
  };
  return map[ext ?? ""] ?? "video/mp4";
}
