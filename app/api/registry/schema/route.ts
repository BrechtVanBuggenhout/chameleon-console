import { NextRequest, NextResponse } from 'next/server'
import { TENANT_ID } from '@/lib/tenant'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

/** GET /api/registry/schema?resourceId=bigquery:project.dataset.table — live column list for the Declare form's picker. */
export async function GET(req: NextRequest) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }
  const resourceId = req.nextUrl.searchParams.get('resourceId')
  if (!resourceId) {
    return NextResponse.json({ error: 'resourceId query parameter is required' }, { status: 400 })
  }

  const tenantId = req.headers.get('x-tenant-id') ?? TENANT_ID
  const headers: Record<string, string> = { 'x-tenant-id': tenantId }
  if (VAULT_API_TOKEN) headers['Authorization'] = `Bearer ${VAULT_API_TOKEN}`

  const res = await fetch(`${VAULT_BASE_URL}/pii-registry/schema?resourceId=${encodeURIComponent(resourceId)}`, {
    headers,
    cache: 'no-store',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
