import { NextRequest, NextResponse } from 'next/server'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL

export async function POST(req: NextRequest) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }

  const body = await req.json()
  const tenantId = req.headers.get('x-tenant-id') ?? 'default-tenant'

  const res = await fetch(`${VAULT_BASE_URL}/deletion-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
