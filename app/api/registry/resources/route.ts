import { NextRequest, NextResponse } from 'next/server'
import { TENANT_ID } from '@/lib/tenant'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
// Dedicated shared secret for the PII declare API. Must equal the Key Vault's
// PII_REGISTRY_WRITE_TOKEN. Kept server-side so the browser never sees it.
const REGISTRY_WRITE_TOKEN = process.env.VAULT_REGISTRY_WRITE_TOKEN
// Key Vault's global app auth (x-api-key). Writes must pass BOTH layers:
// x-api-key for the app-wide hook, Bearer for the declare-route guard.
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

/** POST /api/registry/resources — declare a new PII resource. */
export async function POST(req: NextRequest) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }
  if (!REGISTRY_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Registry write token not configured' }, { status: 503 })
  }

  const body = await req.json()
  const tenantId = req.headers.get('x-tenant-id') ?? TENANT_ID

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    Authorization: `Bearer ${REGISTRY_WRITE_TOKEN}`,
  }
  if (VAULT_API_TOKEN) headers['x-api-key'] = VAULT_API_TOKEN

  const res = await fetch(`${VAULT_BASE_URL}/pii-registry/resources`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
