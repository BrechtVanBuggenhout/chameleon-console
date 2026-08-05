import { NextResponse } from 'next/server'
import { getActiveProjectContext } from '@/lib/project-context'

/** GET /api/registry/discovery — undeclared tables the warehouse crawler found. Read-only. */
export async function GET() {
  const context = await getActiveProjectContext()
  if (!context) {
    // No active project — return an empty queue so the UI renders cleanly.
    return NextResponse.json({ findings: [], count: 0 })
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant-id': context.tenantId }
  if (context.vaultApiToken) headers['Authorization'] = `Bearer ${context.vaultApiToken}`

  try {
    const res = await fetch(`${context.vaultBaseUrl}/pii-registry/discovery`, { headers, cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ findings: [], count: 0 })
  }
}
