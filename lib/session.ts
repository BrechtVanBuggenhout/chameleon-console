// The human ↔ console auth layer -- separate from and never passed to
// chameleon-onboarding (see lib/onboarding-client.ts, which uses this
// deployment's own CONSOLE_SERVICE_CREDENTIAL instead). A session proves
// "which person may use this console right now"; it's issued by the console
// itself once onboarding's /api/console-auth/claim confirms a magic-link
// token resolves to this account's own customerId.
//
// Built on the Web Crypto API (globalThis.crypto.subtle), not Node's
// `crypto` module, so the exact same verification logic works both in
// proxy.ts (which may run on the Edge runtime, where node:crypto isn't
// available) and in ordinary Node route handlers/server components.
const SESSION_SECRET = process.env.CONSOLE_SESSION_SECRET;
const SESSION_COOKIE_NAME = "console_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // ~30 days

export interface SessionPayload {
  customerId: string;
  email: string;
  exp: number; // epoch seconds
}

function toBase64Url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64url");
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payloadB64: string): Promise<string> {
  if (!SESSION_SECRET) {
    throw new Error("CONSOLE_SESSION_SECRET is not configured");
  }
  const key = await importSigningKey(SESSION_SECRET);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return toBase64Url(signature);
}

/** Builds the signed cookie value; does not set the cookie itself. */
export async function createSessionCookieValue(customerId: string, email: string): Promise<string> {
  const payload: SessionPayload = {
    customerId,
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = await sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

/**
 * Verifies and decodes a session cookie value. Returns null on any failure
 * (missing secret, malformed value, bad signature, or expiry) rather than
 * throwing -- callers treat this the same as "not logged in".
 */
export async function verifySessionCookieValue(value: string | undefined): Promise<SessionPayload | null> {
  if (!value || !SESSION_SECRET) return null;

  const [payloadB64, signature] = value.split(".");
  if (!payloadB64 || !signature) return null;

  let expectedSignatureBytes: ArrayBuffer;
  try {
    const key = await importSigningKey(SESSION_SECRET);
    expectedSignatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  } catch {
    return null;
  }

  let providedSignatureBytes: Uint8Array;
  try {
    providedSignatureBytes = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }

  const expected = new Uint8Array(expectedSignatureBytes);
  if (providedSignatureBytes.length !== expected.length) return null;
  // crypto.subtle has no built-in constant-time compare; XOR every byte so
  // the comparison doesn't short-circuit on the first mismatch.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= providedSignatureBytes[i] ^ expected[i];
  }
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
