import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectContext } from '@/lib/project-context'
import { resolveWriteAuthHeaders } from '@/lib/session-credential'

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

  const fallbackHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': context.tenantId,
    Authorization: `Bearer ${context.vaultRegistryWriteToken}`,
  }
  if (context.vaultApiToken) fallbackHeaders['x-api-key'] = context.vaultApiToken
  const headers = await resolveWriteAuthHeaders(context, fallbackHeaders)

  const res = await fetch(`${context.vaultBaseUrl}/pii-registry/resources`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
