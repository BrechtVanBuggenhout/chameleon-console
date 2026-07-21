import { NextRequest, NextResponse } from 'next/server'
import { TENANT_ID } from '@/lib/tenant'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
// Key Vault's global app auth (x-api-key) -- the same shared secret the
// provisioner already has in hand right after standing up this instance
// (see chameleon-onboarding/provisioner/entrypoint.sh), so no new secret
// needs to be provisioned just for this route.
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

/**
 * POST /api/admin/analyst-claims — creates one one-time claim link per
 * analyst email. Called once, by the provisioner, right after this
 * instance is stood up (see provisioner/entrypoint.sh) -- it can't reach
 * the internal-only Key Vault directly, but it CAN reach this console,
 * which lives in the same project and already proxies to Key Vault for
 * everything else. Deliberately excluded from proxy.ts's CONSOLE_PASSWORD
 * gate, since the caller is a machine with the shared key, not a browser
 * session; its own auth check below is the actual gate.
 */
export async function POST(req: NextRequest) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }
  if (!VAULT_API_TOKEN) {
    return NextResponse.json({ error: 'VAULT_API_TOKEN not configured' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${VAULT_API_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const analystEmails = Array.isArray(body?.analystEmails) ? body.analystEmails : []
  if (analystEmails.length === 0) {
    return NextResponse.json({ error: 'analystEmails is required' }, { status: 400 })
  }

  const res = await fetch(`${VAULT_BASE_URL}/admin/analyst-claims`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT_ID,
      'x-api-key': VAULT_API_TOKEN,
    },
    body: JSON.stringify({ analystEmails }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    return NextResponse.json({ error: 'Key Vault rejected the claim creation request', detail: errorBody }, { status: res.status })
  }

  const data = await res.json()
  const claimTokens = Array.isArray(data.claimTokens) ? data.claimTokens : []
  const claimLinks = claimTokens.map((entry: { email: string; claimToken: string }) => ({
    email: entry.email,
    url: `${req.nextUrl.origin}/claim/${entry.claimToken}`,
  }))

  return NextResponse.json({ claimLinks }, { status: 201 })
}
