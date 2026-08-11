import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectContext, type ActiveProjectContext } from '@/lib/project-context'
import { resolveWriteAuthHeaders } from '@/lib/session-credential'

async function writeHeaders(context: ActiveProjectContext): Promise<Record<string, string>> {
  const fallbackHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': context.tenantId,
    Authorization: `Bearer ${context.vaultRegistryWriteToken}`,
  }
  if (context.vaultApiToken) fallbackHeaders['x-api-key'] = context.vaultApiToken
  return resolveWriteAuthHeaders(context, fallbackHeaders)
}

/** GET /api/registry/resources/:resourceId — fetch full detail for editing. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }

  const { resourceId } = await params
  const headers: Record<string, string> = { 'x-tenant-id': context.tenantId }
  if (context.vaultApiToken) headers['Authorization'] = `Bearer ${context.vaultApiToken}`

  const res = await fetch(`${context.vaultBaseUrl}/pii-registry/resources/${encodeURIComponent(resourceId)}`, {
    headers,
    cache: 'no-store',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

/** PUT /api/registry/resources/:resourceId — update an existing manual declaration. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }
  if (!context.vaultRegistryWriteToken) {
    return NextResponse.json({ error: 'Registry write token not configured' }, { status: 503 })
  }

  const { resourceId } = await params
  const body = await req.json()

  const res = await fetch(`${context.vaultBaseUrl}/pii-registry/resources/${encodeURIComponent(resourceId)}`, {
    method: 'PUT',
    headers: await writeHeaders(context),
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

/** DELETE /api/registry/resources/:resourceId — remove a manual declaration. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }
  if (!context.vaultRegistryWriteToken) {
    return NextResponse.json({ error: 'Registry write token not configured' }, { status: 503 })
  }

  const { resourceId } = await params

  const res = await fetch(`${context.vaultBaseUrl}/pii-registry/resources/${encodeURIComponent(resourceId)}`, {
    method: 'DELETE',
    headers: await writeHeaders(context),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
