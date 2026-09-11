import { describe, it, expect } from '@jest/globals'
import { passwordsMatch } from './password-compare'

describe('passwordsMatch', () => {
  it('returns true for equal strings', () => {
    expect(passwordsMatch('correct-horse-battery-staple', 'correct-horse-battery-staple')).toBe(true)
  })

  it('returns false for unequal strings of the same length', () => {
    expect(passwordsMatch('aaaaaaaa', 'bbbbbbbb')).toBe(false)
  })

  it('returns false, not a throw, for different-length strings', () => {
    // The real risk this function exists to avoid: a raw timingSafeEqual
    // on unequal-length buffers throws, which a caller might mishandle
    // as an error rather than a plain rejection -- hashing first sidesteps
    // that entirely, so this must never throw.
    expect(() => passwordsMatch('short', 'a-much-longer-password')).not.toThrow()
    expect(passwordsMatch('short', 'a-much-longer-password')).toBe(false)
  })

  it('returns false for empty vs. non-empty', () => {
    expect(passwordsMatch('', 'not-empty')).toBe(false)
  })

  it('returns true for two empty strings', () => {
    expect(passwordsMatch('', '')).toBe(true)
  })
})
