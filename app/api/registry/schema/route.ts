import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectContext } from '@/lib/project-context'

/** GET /api/registry/schema?resourceId=bigquery:project.dataset.table — live column list for the Declare form's picker. */
export async function GET(req: NextRequest) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }
  const resourceId = req.nextUrl.searchParams.get('resourceId')
  if (!resourceId) {
    return NextResponse.json({ error: 'resourceId query parameter is required' }, { status: 400 })
  }

  const headers: Record<string, string> = { 'x-tenant-id': context.tenantId }
  if (context.vaultApiToken) headers['Authorization'] = `Bearer ${context.vaultApiToken}`

  const res = await fetch(`${context.vaultBaseUrl}/pii-registry/schema?resourceId=${encodeURIComponent(resourceId)}`, {
    headers,
    cache: 'no-store',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
