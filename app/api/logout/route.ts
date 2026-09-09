import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME } from '@/lib/session'

/**
 * POST /api/logout -- clears both auth cookies this console ever sets
 * (the real customer session, and the operator/break-glass session; see
 * lib/session.ts and proxy.ts). Clears both unconditionally rather than
 * detecting which one is present -- deleting a cookie that was never set
 * is a harmless no-op, and this stays correct regardless of which auth
 * path a given deployment/user actually used.
 */
export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  cookieStore.delete('console_auth')
  return NextResponse.json({ ok: true })
}
