import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectContext } from '@/lib/project-context'
import { resolveWriteAuthHeaders } from '@/lib/session-credential'

export async function POST(req: NextRequest) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }

  const body = await req.json()

  // Was the one console action calling out to Key Vault with the shared
  // token unconditionally -- see chameleon-key-vault#90, which is what
  // makes a per-session credential from resolveWriteAuthHeaders actually
  // attributable server-side instead of silently falling back.
  const fallbackHeaders: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant-id': context.tenantId }
  if (context.vaultApiToken) fallbackHeaders['Authorization'] = `Bearer ${context.vaultApiToken}`
  const headers = await resolveWriteAuthHeaders(context, fallbackHeaders)

  const res = await fetch(`${context.vaultBaseUrl}/pii-vault/decrypt`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
