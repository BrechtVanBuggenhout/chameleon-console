import { NextRequest, NextResponse } from 'next/server'
import { TENANT_ID } from '@/lib/tenant'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  if (VAULT_API_TOKEN) headers['Authorization'] = `Bearer ${VAULT_API_TOKEN}`
  return headers
}

/**
 * DELETE /api/decrypted-views/:viewName — revoke a decrypted view. Revoking
 * flips its status and drops the underlying BigQuery view; it does not
 * touch the source data, same as the registry's own delete-declaration
 * semantics.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ viewName: string }> }
) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }

  const { viewName } = await params
  const tenantId = req.headers.get('x-tenant-id') ?? TENANT_ID
  const body = await req.json().catch(() => ({}))

  const res = await fetch(`${VAULT_BASE_URL}/decrypted-views/${encodeURIComponent(viewName)}`, {
    method: 'DELETE',
    headers: authHeaders({ 'x-tenant-id': tenantId }),
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
