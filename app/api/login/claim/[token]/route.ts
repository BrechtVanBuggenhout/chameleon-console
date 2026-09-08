import { NextRequest, NextResponse } from 'next/server'
import { claimLoginToken } from '@/lib/onboarding-client'
import { createSessionCookieValue, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/session'

/**
 * POST /api/login/claim/:token — actually redeems the one-time login token
 * and sets this console's session cookie (see lib/session.ts's "two
 * separate auth layers" note: onboarding only ever proves "this token
 * resolves to this email/customerId", it never issues or sees this cookie).
 *
 * Deliberately a POST, triggered only by a real click on
 * /login/claim/:token (see LoginClaimClient) -- never a plain GET on the
 * emailed link itself. Same reveal-on-click shape as
 * /api/claim/:token (the analyst-credential flow), which solved this exact
 * link-prefetch problem first.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  let result
  try {
    result = await claimLoginToken(token)
  } catch {
    return NextResponse.json({ ok: false, reason: 'failed' }, { status: 502 })
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 })
  }

  const sessionValue = await createSessionCookieValue(result.customerId, result.email)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })
  return response
}
