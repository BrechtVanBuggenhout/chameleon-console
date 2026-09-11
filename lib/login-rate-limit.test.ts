import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { isRateLimited } from './login-rate-limit'

describe('isRateLimited', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('allows attempts under the limit', () => {
    const key = 'key-under-limit'
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(key)).toBe(false)
    }
  })

  it('blocks the 6th attempt within the window', () => {
    const key = 'key-6th-attempt'
    for (let i = 0; i < 5; i++) {
      isRateLimited(key)
    }
    expect(isRateLimited(key)).toBe(true)
  })

  it('counts a correct guess on attempt 6 as still blocked -- success does not bypass the limiter', () => {
    const key = 'key-success-does-not-bypass'
    for (let i = 0; i < 5; i++) {
      isRateLimited(key)
    }
    // The caller would still check the password on this 6th call, but
    // isRateLimited itself must report blocked regardless of whether that
    // password check would have succeeded.
    expect(isRateLimited(key)).toBe(true)
  })

  it('un-blocks once the 15-minute window rolls over', () => {
    const key = 'key-window-rollover'
    jest.setSystemTime(0)
    for (let i = 0; i < 6; i++) {
      isRateLimited(key)
    }
    expect(isRateLimited(key)).toBe(true)

    jest.setSystemTime(15 * 60 * 1000 + 1)
    expect(isRateLimited(key)).toBe(false)
  })

  it('tracks independent keys separately', () => {
    const keyA = 'key-independent-a'
    const keyB = 'key-independent-b'
    for (let i = 0; i < 6; i++) {
      isRateLimited(keyA)
    }
    expect(isRateLimited(keyA)).toBe(true)
    expect(isRateLimited(keyB)).toBe(false)
  })
})
