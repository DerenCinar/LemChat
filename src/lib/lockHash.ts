export type LockKdf = 'legacy-sha256' | 'pbkdf2';

export const PBKDF2_ITERATIONS = 310_000;

export const toHex = (buffer: ArrayBuffer | Uint8Array): string =>
  Array.from(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/** Original scheme (salted, 20k rounds of SHA-256). Kept only to verify old locks. */
export async function legacyHash(secret: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${secret}`);
  let digest = await crypto.subtle.digest('SHA-256', data);
  for (let i = 0; i < 20000; i += 1) {
    const next = new Uint8Array(digest.byteLength + data.byteLength);
    next.set(new Uint8Array(digest), 0);
    next.set(data, digest.byteLength);
    digest = await crypto.subtle.digest('SHA-256', next);
  }
  return toHex(digest);
}

export async function pbkdf2Hash(
  secret: string,
  salt: string,
  iterations = PBKDF2_ITERATIONS
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations },
    key,
    256
  );
  return toHex(bits);
}

export const hashWith = (kdf: LockKdf, secret: string, salt: string): Promise<string> =>
  kdf === 'pbkdf2' ? pbkdf2Hash(secret, salt) : legacyHash(secret, salt);

export const newSalt = (): string => toHex(crypto.getRandomValues(new Uint8Array(16)));

/** Constant-time-ish string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
