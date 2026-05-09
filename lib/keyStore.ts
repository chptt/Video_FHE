/**
 * ⚠️  MVP DEMO KEY STORE — NOT PRODUCTION SAFE ⚠️
 *
 * In-memory key store for AES encryption keys.
 * Resets on every server restart / Vercel cold start.
 *
 * TODO (production): Replace with Vercel KV, PlanetScale, or Lit Protocol.
 */

type KeyEntry = { keyBase64: string; creator: string };

// Simple module-level Map — no global augmentation needed
// (Next.js hot-reload will reset this in dev, which is acceptable for demo)
const store = new Map<string, KeyEntry>();

export function setKey(cid: string, entry: KeyEntry): void {
  store.set(cid, entry);
}

export function getKey(cid: string): KeyEntry | undefined {
  return store.get(cid);
}
