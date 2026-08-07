import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectContext, type ActiveProjectContext } from '@/lib/project-context'

function authHeaders(context: ActiveProjectContext, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  if (context.vaultApiToken) headers['Authorization'] = `Bearer ${context.vaultApiToken}`
  return headers
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }

  const { id } = await params
  const res = await fetch(`${context.vaultBaseUrl}/deletion-requests/${id}`, {
    headers: authHeaders(context, { 'x-tenant-id': context.tenantId }),
    cache: 'no-store',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }

  const { id } = await params
  const body = await req.json()

  const res = await fetch(`${context.vaultBaseUrl}/deletion-requests/${id}/advance`, {
    method: 'POST',
    headers: authHeaders(context, { 'x-tenant-id': context.tenantId }),
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
