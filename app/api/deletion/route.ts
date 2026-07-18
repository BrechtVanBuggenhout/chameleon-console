import { NextRequest, NextResponse } from 'next/server'
import { TENANT_ID } from '@/lib/tenant'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

export async function POST(req: NextRequest) {
  if (!VAULT_BASE_URL) {
    return NextResponse.json({ error: 'VAULT_BASE_URL not configured' }, { status: 503 })
  }

  const body = await req.json()
  const tenantId = req.headers.get('x-tenant-id') ?? TENANT_ID

  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant-id': tenantId }
  if (VAULT_API_TOKEN) headers['Authorization'] = `Bearer ${VAULT_API_TOKEN}`

  const res = await fetch(`${VAULT_BASE_URL}/deletion-requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
