import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectContext } from '@/lib/project-context'

/**
 * GET /api/registry/sync-runs/:runId — polled by the progress bar after
 * Sync Now returns a runId. Read-only, no write token needed (mirrors
 * Key Vault's own GET /pii-registry/sync-runs/:runId, which is open to
 * any authenticated caller).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }

  const { runId } = await params
  const headers: Record<string, string> = { 'x-tenant-id': context.tenantId }
  if (context.vaultApiToken) headers['Authorization'] = `Bearer ${context.vaultApiToken}`

  const res = await fetch(`${context.vaultBaseUrl}/pii-registry/sync-runs/${encodeURIComponent(runId)}`, {
    headers,
    cache: 'no-store',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
