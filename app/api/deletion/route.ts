import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectContext } from '@/lib/project-context'
import { resolveWriteAuthHeaders } from '@/lib/session-credential'

export async function POST(req: NextRequest) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }

  const body = await req.json()

  const fallbackHeaders: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant-id': context.tenantId }
  if (context.vaultApiToken) fallbackHeaders['Authorization'] = `Bearer ${context.vaultApiToken}`
  const headers = await resolveWriteAuthHeaders(context, fallbackHeaders)

  const res = await fetch(`${context.vaultBaseUrl}/deletion-requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
