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
  return NextResponse.json(data, { status: res.status })
}
