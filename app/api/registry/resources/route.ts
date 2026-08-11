import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectContext } from '@/lib/project-context'

/**
 * GET /api/registry/resources — the raw, untyped registry list (unlike
 * lib/vault-api.ts's getRegistryResources(), which is server-only and
 * narrows to the display-focused RegistryResource shape). Used by client
 * components that need fields RegistryResource doesn't carry, e.g. the
 * Deletion tab's affected-resources panel needing sourceRedactionStrategy.
 */
export async function GET() {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }

  const headers: Record<string, string> = { 'x-tenant-id': context.tenantId }
  if (context.vaultApiToken) headers['Authorization'] = `Bearer ${context.vaultApiToken}`

  const res = await fetch(`${context.vaultBaseUrl}/pii-registry/resources`, {
    headers,
    cache: 'no-store',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

/** POST /api/registry/resources — declare a new PII resource. */
export async function POST(req: NextRequest) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }
  if (!context.vaultRegistryWriteToken) {
    return NextResponse.json({ error: 'Registry write token not configured' }, { status: 503 })
  }

  const body = await req.json()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': context.tenantId,
    Authorization: `Bearer ${context.vaultRegistryWriteToken}`,
  }
  if (context.vaultApiToken) headers['x-api-key'] = context.vaultApiToken

  const res = await fetch(`${context.vaultBaseUrl}/pii-registry/resources`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
