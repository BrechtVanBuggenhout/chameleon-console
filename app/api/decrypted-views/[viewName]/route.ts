import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectContext } from '@/lib/project-context'

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
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }

  const { viewName } = await params
  const body = await req.json().catch(() => ({}))

  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant-id': context.tenantId }
  if (context.vaultApiToken) headers['Authorization'] = `Bearer ${context.vaultApiToken}`

  const res = await fetch(`${context.vaultBaseUrl}/decrypted-views/${encodeURIComponent(viewName)}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
