import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectContext } from '@/lib/project-context'

// Thin proxy to Key Vault's existing GET /key-status/:userId -- returns only
// key lifecycle metadata (status/timestamps), never decrypted PII, so this is
// safe to expose for the deletion page's "does this ID exist" check without
// creating a decrypt-adjacent lookup surface.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const context = await getActiveProjectContext()
  if (!context) {
    return NextResponse.json({ error: 'No active project selected' }, { status: 503 })
  }

  const { userId } = await params
  const headers: Record<string, string> = { 'x-tenant-id': context.tenantId }
  if (context.vaultApiToken) headers['Authorization'] = `Bearer ${context.vaultApiToken}`

  const res = await fetch(`${context.vaultBaseUrl}/key-status/${encodeURIComponent(userId)}`, {
    headers,
    cache: 'no-store',
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
