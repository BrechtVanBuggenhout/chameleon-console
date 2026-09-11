import { createHash, timingSafeEqual } from 'crypto'

// Hash-then-compare rather than a direct timingSafeEqual on the raw values:
// timingSafeEqual throws on a length mismatch, and checking length first is
// itself a (smaller, but real) side channel -- hashing both to a fixed
// 32-byte digest first sidesteps needing a length check at all. Extracted
// from app/login/operator/page.tsx so it's directly unit-testable.
export function passwordsMatch(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest()
  const hashB = createHash('sha256').update(b).digest()
  return timingSafeEqual(hashA, hashB)
}
