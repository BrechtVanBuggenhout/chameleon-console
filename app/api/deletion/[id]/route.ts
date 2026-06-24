import { NextRequest, NextResponse } from 'next/server'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }

  const { id } = await params
  const res = await fetch(`${VAULT_BASE_URL}/deletion-requests/${id}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }

  const { id } = await params
  const body = await req.json()
  const tenantId = req.headers.get('x-tenant-id') ?? 'default-tenant'

  const res = await fetch(`${VAULT_BASE_URL}/deletion-requests/${id}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
