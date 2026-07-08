import { NextRequest, NextResponse } from 'next/server'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
const REGISTRY_WRITE_TOKEN = process.env.VAULT_REGISTRY_WRITE_TOKEN
// Key Vault's global app auth (x-api-key). Writes must pass BOTH layers:
// x-api-key for the app-wide hook, Bearer for the declare-route guard.
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

function guard(): NextResponse | null {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }
  if (!REGISTRY_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Registry write token not configured' }, { status: 503 })
  }
  return null
}

function writeHeaders(tenantId: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    Authorization: `Bearer ${REGISTRY_WRITE_TOKEN}`,
  }
  if (VAULT_API_TOKEN) headers['x-api-key'] = VAULT_API_TOKEN
  return headers
}

/** PUT /api/registry/resources/:resourceId — update an existing manual declaration. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  const blocked = guard()
  if (blocked) return blocked

  const { resourceId } = await params
  const body = await req.json()
  const tenantId = req.headers.get('x-tenant-id') ?? 'default-tenant'

  const res = await fetch(`${VAULT_BASE_URL}/pii-registry/resources/${encodeURIComponent(resourceId)}`, {
    method: 'PUT',
    headers: writeHeaders(tenantId),
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

/** DELETE /api/registry/resources/:resourceId — remove a manual declaration. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  const blocked = guard()
  if (blocked) return blocked

  const { resourceId } = await params
  const tenantId = req.headers.get('x-tenant-id') ?? 'default-tenant'

  const res = await fetch(`${VAULT_BASE_URL}/pii-registry/resources/${encodeURIComponent(resourceId)}`, {
    method: 'DELETE',
    headers: writeHeaders(tenantId),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
