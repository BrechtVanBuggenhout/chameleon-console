import { NextRequest, NextResponse } from 'next/server'
import { TENANT_ID } from '@/lib/tenant'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
// Same dedicated write-token gate as /api/registry/resources -- this triggers
// real encryption + BigQuery writes, not a read, so it's held to the same bar.
const REGISTRY_WRITE_TOKEN = process.env.VAULT_REGISTRY_WRITE_TOKEN
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

/** POST /api/registry/sync-now — trigger the pii_vault backfill/sync job on demand, instead of waiting for its daily schedule. */
export async function POST(req: NextRequest) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }
  if (!REGISTRY_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Registry write token not configured' }, { status: 503 })
  }

  const tenantId = req.headers.get('x-tenant-id') ?? TENANT_ID
  const headers: Record<string, string> = {
    'x-tenant-id': tenantId,
    Authorization: `Bearer ${REGISTRY_WRITE_TOKEN}`,
  }
  if (VAULT_API_TOKEN) headers['x-api-key'] = VAULT_API_TOKEN

  const res = await fetch(`${VAULT_BASE_URL}/pii-registry/sync-now`, {
    method: 'POST',
    headers,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
