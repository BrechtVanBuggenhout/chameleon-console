import { NextRequest, NextResponse } from 'next/server'
import { TENANT_ID } from '@/lib/tenant'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

// Thin proxy to Key Vault's existing GET /key-status/:userId -- returns only
// key lifecycle metadata (status/timestamps), never decrypted PII, so this is
// safe to expose for the deletion page's "does this ID exist" check without
// creating a decrypt-adjacent lookup surface.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }

  const { userId } = await params
  const tenantId = req.headers.get('x-tenant-id') ?? TENANT_ID
  const headers: Record<string, string> = { 'x-tenant-id': tenantId }
  if (VAULT_API_TOKEN) headers['Authorization'] = `Bearer ${VAULT_API_TOKEN}`

  const res = await fetch(`${VAULT_BASE_URL}/key-status/${encodeURIComponent(userId)}`, {
    headers,
    cache: 'no-store',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
