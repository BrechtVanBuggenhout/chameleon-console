import { NextResponse } from 'next/server'
import { getActiveProjectContext } from '@/lib/project-context'

/** GET /api/decrypted-views/available-fields — field names actually synced into pii_vault for this tenant. */
export async function GET() {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ fields: [] })
  }

  const headers: Record<string, string> = { 'x-tenant-id': context.tenantId }
  if (context.vaultApiToken) headers['Authorization'] = `Bearer ${context.vaultApiToken}`

  const res = await fetch(`${context.vaultBaseUrl}/decrypted-views/available-fields`, {
    headers,
    cache: 'no-store',
  })

  const data = await res.json()
  // Surfaced so the console can tell a customer *which* tenant_id came back
  // empty -- otherwise "nothing synced yet" looks identical whether the
  // sync genuinely never ran, or it ran under a different tenant_id than
  // this project connection is currently querying with.
  return NextResponse.json({ ...data, tenantId: context.tenantId }, { status: res.status })
}
