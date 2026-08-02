import { NextRequest, NextResponse } from 'next/server'
import { TENANT_ID } from '@/lib/tenant'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

/** GET /api/decrypted-views/available-fields — field names actually synced into pii_vault for this tenant. */
export async function GET(req: NextRequest) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ fields: [] })
  }

  const tenantId = req.headers.get('x-tenant-id') ?? TENANT_ID
  const headers: Record<string, string> = { 'x-tenant-id': tenantId }
  if (VAULT_API_TOKEN) headers['Authorization'] = `Bearer ${VAULT_API_TOKEN}`

  const res = await fetch(`${VAULT_BASE_URL}/decrypted-views/available-fields`, {
    headers,
    cache: 'no-store',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
