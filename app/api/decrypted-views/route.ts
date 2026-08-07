import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectContext, type ActiveProjectContext } from '@/lib/project-context'

function authHeaders(context: ActiveProjectContext, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  if (context.vaultApiToken) headers['Authorization'] = `Bearer ${context.vaultApiToken}`
  return headers
}

/** GET /api/decrypted-views — list this tenant's declared decrypted views. */
export async function GET() {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ views: [] })
  }

  const res = await fetch(`${context.vaultBaseUrl}/decrypted-views`, {
    headers: authHeaders(context, { 'x-tenant-id': context.tenantId }),
    cache: 'no-store',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

/** POST /api/decrypted-views — declare a new decrypted view. */
export async function POST(req: NextRequest) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }

  const body = await req.json()

  const res = await fetch(`${context.vaultBaseUrl}/decrypted-views`, {
    method: 'POST',
    headers: authHeaders(context, { 'x-tenant-id': context.tenantId }),
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
