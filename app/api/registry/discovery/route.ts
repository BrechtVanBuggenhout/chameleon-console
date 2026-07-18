import { NextRequest, NextResponse } from 'next/server'
import { TENANT_ID } from '@/lib/tenant'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

/** GET /api/registry/discovery — undeclared tables the warehouse crawler found. Read-only. */
export async function GET(req: NextRequest) {
  if (!VAULT_BASE_URL) {
    // No backend wired locally — return an empty queue so the UI renders cleanly.
    return NextResponse.json({ findings: [], count: 0 })
  }

  const tenantId = req.headers.get('x-tenant-id') ?? TENANT_ID
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant-id': tenantId }
  if (VAULT_API_TOKEN) headers['Authorization'] = `Bearer ${VAULT_API_TOKEN}`

  try {
    const res = await fetch(`${VAULT_BASE_URL}/pii-registry/discovery`, { headers, cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ findings: [], count: 0 })
  }
}
