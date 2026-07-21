import { NextRequest, NextResponse } from 'next/server'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL

/**
 * POST /api/claim/:token — consumes a one-time analyst claim token. No
 * VAULT_API_TOKEN attached here on purpose: the token in the URL is Key
 * Vault's own authorization for this one action (see
 * chameleon-key-vault/src/middleware/auth.ts's isExemptFromAuth), since the
 * analyst clicking this link has no credential yet, shared or otherwise.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }

  const { token } = await params

  const res = await fetch(`${VAULT_BASE_URL}/admin/analyst-claims/${encodeURIComponent(token)}/claim`, {
    method: 'POST',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
