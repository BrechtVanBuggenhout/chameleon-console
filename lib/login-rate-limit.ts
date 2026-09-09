// In-memory rate limiter for the operator password login. Same "in-memory
// is good enough" bar chameleon-key-vault's own /encrypt rate limit already
// uses (@fastify/rate-limit, global: false, no distributed store) -- resets
// on cold start and doesn't share state across Cloud Run instances, an
// accepted tradeoff already established elsewhere in this codebase, not a
// new one introduced here. The shared break-glass password has no other
// throttle at all today, so even this is a real improvement over nothing.
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, { count: number; windowStart: number }>();

/**
 * Counts every attempt (success or failure) against `key`, so a correct
 * guess on attempt 6 still returns true -- an attacker can't use a
 * successful login to learn the limiter reset, and a real operator who
 * mistypes the password 5 times still has to wait out the window like
 * anyone else.
 */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}
