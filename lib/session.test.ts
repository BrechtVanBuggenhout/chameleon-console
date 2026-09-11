import { describe, it, expect } from '@jest/globals'
import { createHmac } from 'crypto'
import { createSessionCookieValue, verifySessionCookieValue } from './session'

// HMAC-SHA256 is a standard, deterministic algorithm -- Node's crypto
// module produces byte-identical output to session.ts's Web Crypto
// (crypto.subtle) implementation for the same key/message, so this lets
// tests construct a genuinely validly-signed token without needing
// session.ts to export its internal sign()/importSigningKey().
function signWithTestSecret(payloadB64: string): string {
  return createHmac('sha256', process.env.CONSOLE_SESSION_SECRET as string).update(payloadB64).digest('base64url')
}

describe('session cookie signing', () => {
  it('round-trips a real create -> verify', async () => {
    const value = await createSessionCookieValue('cust-1', 'person@example.com')
    const payload = await verifySessionCookieValue(value)

    expect(payload).not.toBeNull()
    expect(payload?.customerId).toBe('cust-1')
    expect(payload?.email).toBe('person@example.com')
    expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('rejects a tampered payload (signature no longer matches)', async () => {
    const value = await createSessionCookieValue('cust-1', 'person@example.com')
    const [payloadB64, signature] = value.split('.')
    const tamperedPayload = Buffer.from(
      JSON.stringify({ customerId: 'attacker', email: 'attacker@example.com', exp: 9999999999 })
    ).toString('base64url')

    const result = await verifySessionCookieValue(`${tamperedPayload}.${signature}`)

    expect(result).toBeNull()
    expect(payloadB64).not.toBe(tamperedPayload) // sanity: this really is a different payload
  })

  it('rejects a tampered signature', async () => {
    const value = await createSessionCookieValue('cust-1', 'person@example.com')
    const [payloadB64] = value.split('.')
    const wrongSignature = Buffer.from('not-the-real-signature').toString('base64url')

    const result = await verifySessionCookieValue(`${payloadB64}.${wrongSignature}`)

    expect(result).toBeNull()
  })

  it('rejects an expired token even with a genuinely valid signature', async () => {
    // exp is not a parameter of createSessionCookieValue, so an expired
    // token is hand-built here -- but genuinely, correctly signed with
    // the same HMAC-SHA256 algorithm and secret session.ts itself uses,
    // so this isolates the expiry check from the signature check rather
    // than accidentally testing signature-mismatch again.
    const expiredPayloadB64 = Buffer.from(
      JSON.stringify({ customerId: 'cust-1', email: 'person@example.com', exp: 1 })
    ).toString('base64url')
    const validSignatureForExpiredPayload = signWithTestSecret(expiredPayloadB64)

    const result = await verifySessionCookieValue(`${expiredPayloadB64}.${validSignatureForExpiredPayload}`)

    expect(result).toBeNull()
  })

  it('returns null (never throws) on malformed input', async () => {
    await expect(verifySessionCookieValue(undefined)).resolves.toBeNull()
    await expect(verifySessionCookieValue('')).resolves.toBeNull()
    await expect(verifySessionCookieValue('not-a-valid-token')).resolves.toBeNull()
    await expect(verifySessionCookieValue('..')).resolves.toBeNull()
    await expect(verifySessionCookieValue('garbage.garbage')).resolves.toBeNull()
  })
})
