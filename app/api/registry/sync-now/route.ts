import { NextResponse } from 'next/server'
import { getActiveProjectContext } from '@/lib/project-context'

/** POST /api/registry/sync-now — trigger the pii_vault backfill/sync job on demand, instead of waiting for its daily schedule. */
export async function POST() {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }
  if (!context.vaultRegistryWriteToken) {
    return NextResponse.json({ error: 'Registry write token not configured' }, { status: 503 })
  }

  const headers: Record<string, string> = {
    'x-tenant-id': context.tenantId,
    Authorization: `Bearer ${context.vaultRegistryWriteToken}`,
  }
  if (context.vaultApiToken) headers['x-api-key'] = context.vaultApiToken

  const res = await fetch(`${context.vaultBaseUrl}/pii-registry/sync-now`, {
    method: 'POST',
    headers,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
