import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectContext } from '@/lib/project-context'

/**
 * POST /api/registry/sync-now — trigger the pii_vault backfill/sync job on
 * demand, instead of waiting for its daily schedule. Optional JSON body
 * `{ resourceId }` scopes the run to just that one declared resource;
 * omitted (or no body at all), it syncs every manually-declared resource
 * for the tenant, same as before.
 */
export async function POST(request: NextRequest) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }
  if (!context.vaultRegistryWriteToken) {
    return NextResponse.json({ error: 'Registry write token not configured' }, { status: 503 })
  }

  let resourceId: string | undefined
  try {
    const body = await request.json()
    if (typeof body?.resourceId === 'string') resourceId = body.resourceId
  } catch {
    // No body sent (whole-tenant sync) — fine, resourceId stays undefined.
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': context.tenantId,
    Authorization: `Bearer ${context.vaultRegistryWriteToken}`,
  }
  if (context.vaultApiToken) headers['x-api-key'] = context.vaultApiToken

  const res = await fetch(`${context.vaultBaseUrl}/pii-registry/sync-now`, {
    method: 'POST',
    headers,
    body: JSON.stringify(resourceId ? { resourceId } : {}),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
