import { NextRequest, NextResponse } from 'next/server'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

/**
 * POST /api/verify-certificate — server-side twin of
 * chameleon-key-vault/scripts/verify-cert.ts, reachable from a browser.
 *
 * Deliberately calls Key Vault directly via VAULT_BASE_URL (same pattern as
 * /api/version), not through kvFetch/getActiveProjectContext(): this is
 * meant to work for an outside auditor with no console login, verifying a
 * certificate against exactly the Key Vault this console is deployed
 * alongside. No secrets involved -- JWKS and the by-hash chain lookup are
 * both public endpoints at the app layer (see auth.ts's
 * PUBLIC_VERIFICATION_PATHS / CHAIN_BY_HASH_ROUTE_PATTERN).
 */

async function verifySignature(jwt: string, jwks: ReturnType<typeof createRemoteJWKSet>): Promise<JWTPayload> {
  const { payload } = await jwtVerify(jwt, jwks, {
    issuer: 'Chameleon Key Vault',
    algorithms: ['PS256'],
  })
  return payload
}

async function walkChain(baseUrl: string, jwks: ReturnType<typeof createRemoteJWKSet>, startPayload: JWTPayload) {
  let depth = 1
  let previousHash = startPayload.previousCertificateHash as string | null | undefined
  const chain: { hash: string; verified: boolean }[] = []

  while (previousHash) {
    const res = await fetch(`${baseUrl}/certificate-chain/by-hash/${previousHash}`, { cache: 'no-store' })
    if (!res.ok) {
      return { depth, complete: false, chain, brokenAtHash: previousHash }
    }
    const { certificate: linkJwt } = (await res.json()) as { certificate: string }
    const linkPayload = await verifySignature(linkJwt, jwks)
    chain.push({ hash: previousHash, verified: true })
    depth += 1
    previousHash = linkPayload.previousCertificateHash as string | null | undefined
  }

  return { depth, complete: true, chain, brokenAtHash: null }
}

export async function POST(req: NextRequest) {
  const vaultBaseUrl = process.env.VAULT_BASE_URL
  if (!vaultBaseUrl) {
    return NextResponse.json({ verified: false, error: 'This console has no Key Vault configured to verify against.' }, { status: 500 })
  }

  let jwt: string
  try {
    const body = await req.json()
    jwt = String(body.jwt ?? '').trim()
  } catch {
    return NextResponse.json({ verified: false, error: 'Invalid request body.' }, { status: 400 })
  }
  if (!jwt) {
    return NextResponse.json({ verified: false, error: 'Paste a certificate JWT.' }, { status: 400 })
  }

  const jwks = createRemoteJWKSet(new URL(`${vaultBaseUrl}/.well-known/jwks.json`))

  try {
    const payload = await verifySignature(jwt, jwks)

    if (payload.chainSequence == null) {
      return NextResponse.json({
        verified: true,
        payload,
        chain: { depth: 1, complete: true, note: 'Unchained fallback issuance — nothing to walk.' },
      })
    }

    const chainResult = await walkChain(vaultBaseUrl, jwks, payload)
    return NextResponse.json({ verified: true, payload, chain: chainResult })
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    let reason = err.message ?? 'Unknown error.'
    if (err.code === 'ERR_JWT_SIGNATURE_VERIFICATION_FAILED') {
      reason = 'The signature does not match the public key — this certificate is not authentic, or has been tampered with.'
    } else if (err.code === 'ERR_JWKS_NO_MATCHING_KEY') {
      reason = 'No matching signing key found in the published JWKS (check the kid header).'
    }
    return NextResponse.json({ verified: false, error: reason }, { status: 200 })
  }
}
