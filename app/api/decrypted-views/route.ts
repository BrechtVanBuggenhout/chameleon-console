import { NextRequest, NextResponse } from 'next/server'
import { TENANT_ID } from '@/lib/tenant'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
// Same shared app-wide key every other management route (registry, deletion,
// etc.) authenticates with -- decrypted-views.ts in Key Vault is gated by
// the same VAULT_API_KEY hook, not a dedicated write token like the PII
// declare route.
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  if (VAULT_API_TOKEN) headers['Authorization'] = `Bearer ${VAULT_API_TOKEN}`
  return headers
}

/** GET /api/decrypted-views — list this tenant's declared decrypted views. */
export async function GET(req: NextRequest) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ views: [] })
  }

  const tenantId = req.headers.get('x-tenant-id') ?? TENANT_ID
  const res = await fetch(`${VAULT_BASE_URL}/decrypted-views`, {
    headers: authHeaders({ 'x-tenant-id': tenantId }),
    cache: 'no-store',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

/** POST /api/decrypted-views — declare a new decrypted view. */
export async function POST(req: NextRequest) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }

  const body = await req.json()
  const tenantId = req.headers.get('x-tenant-id') ?? TENANT_ID

  const res = await fetch(`${VAULT_BASE_URL}/decrypted-views`, {
    method: 'POST',
    headers: authHeaders({ 'x-tenant-id': tenantId }),
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
