import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { createServer, type Server } from 'http'
import { generateKeyPair, exportJWK, SignJWT, type KeyLike, type JWK } from 'jose'
import { POST } from './route'

// Real cryptographic verification against a real local HTTP server, not
// mocked -- this route IS the crypto verification logic (PS256 signature
// + hash-chain walk), and jose's createRemoteJWKSet does its own internal
// fetch that jest.mock('jose', ...) does not actually intercept under
// next/jest's SWC transform (confirmed live: the factory never ran, and
// global.fetch overrides are likewise not seen by it). Spinning up a real
// server on localhost sidesteps all of that -- no DNS, no mocking, both
// the JWKS lookup and the chain-by-hash lookup are genuinely fetched over
// real HTTP, and jwtVerify's signature verification is entirely real.

let server: Server
let baseUrl: string
let privateKey: KeyLike
let otherPrivateKey: KeyLike // a different keypair, to simulate a tampered/forged certificate
let currentJwks: { keys: JWK[] } = { keys: [] }
let currentChainByHash: Record<string, string> = {}
const KID = 'test-key-1'

async function signCertificate(claims: Record<string, unknown>, signingKey: KeyLike = privateKey): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'PS256', kid: KID })
    .setIssuer('Chameleon Key Vault')
    .setIssuedAt()
    .sign(signingKey)
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/verify-certificate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeAll(async () => {
  const real = await generateKeyPair('PS256')
  privateKey = real.privateKey
  const publicJwk = await exportJWK(real.publicKey)
  currentJwks = { keys: [{ ...publicJwk, kid: KID, alg: 'PS256', use: 'sig' } as JWK] }
  const other = await generateKeyPair('PS256')
  otherPrivateKey = other.privateKey

  server = createServer((req, res) => {
    if (req.url === '/.well-known/jwks.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(currentJwks))
      return
    }
    const match = req.url?.match(/\/certificate-chain\/by-hash\/(.+)$/)
    if (match) {
      const linkJwt = currentChainByHash[match[1]]
      if (!linkJwt) {
        res.writeHead(404)
        res.end()
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ certificate: linkJwt }))
      return
    }
    res.writeHead(404)
    res.end()
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('failed to start test server')
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
})

beforeEach(() => {
  process.env.VAULT_BASE_URL = baseUrl
  currentChainByHash = {}
})

afterEach(() => {
  delete process.env.VAULT_BASE_URL
})

describe('POST /api/verify-certificate', () => {
  it('verifies a genuinely, correctly signed certificate with no chain to walk', async () => {
    const jwt = await signCertificate({ sub: 'user-1', chainSequence: null })

    const res = await POST(postRequest({ jwt }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.verified).toBe(true)
    expect(body.payload.sub).toBe('user-1')
    expect(body.chain.complete).toBe(true)
    expect(body.chain.depth).toBe(1)
  })

  it('rejects a certificate signed with a different key (forged/tampered)', async () => {
    const forgedJwt = await signCertificate({ sub: 'attacker', chainSequence: null }, otherPrivateKey)

    const res = await POST(postRequest({ jwt: forgedJwt }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.verified).toBe(false)
    expect(body.error).toMatch(/does not match the public key/)
  })

  it('walks a real, correctly signed chain to completion', async () => {
    const rootHash = 'hash-of-root-cert'
    const rootJwt = await signCertificate({ sub: 'user-1', chainSequence: 0 })
    const headJwt = await signCertificate({ sub: 'user-1', chainSequence: 1, previousCertificateHash: rootHash })
    currentChainByHash = { [rootHash]: rootJwt }

    const res = await POST(postRequest({ jwt: headJwt }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.verified).toBe(true)
    expect(body.chain.complete).toBe(true)
    expect(body.chain.depth).toBe(2)
    expect(body.chain.chain).toEqual([{ hash: rootHash, verified: true }])
  })

  it('reports an incomplete chain when a link is unreachable, without failing the top-level verification', async () => {
    const missingHash = 'hash-that-does-not-resolve'
    const headJwt = await signCertificate({ sub: 'user-1', chainSequence: 1, previousCertificateHash: missingHash })
    // currentChainByHash left empty -- nothing resolves missingHash

    const res = await POST(postRequest({ jwt: headJwt }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.verified).toBe(true) // the head certificate's own signature is still genuinely valid
    expect(body.chain.complete).toBe(false)
    expect(body.chain.brokenAtHash).toBe(missingHash)
  })

  it('returns 500 when this deployment has no Key Vault configured', async () => {
    delete process.env.VAULT_BASE_URL

    const res = await POST(postRequest({ jwt: 'anything' }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.verified).toBe(false)
  })

  it('returns 400 for an empty jwt', async () => {
    const res = await POST(postRequest({ jwt: '  ' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for an unparseable request body', async () => {
    const req = new NextRequest('http://localhost/api/verify-certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
