import { NextRequest, NextResponse } from 'next/server'
import { claimLoginToken } from '@/lib/onboarding-client'
import { createSessionCookieValue, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/session'

/**
 * GET /login/claim/:token — the link a customer clicks from their login
 * email. Redeems the one-time token via onboarding, then signs and sets
 * this console's own session cookie (see lib/session.ts's "two separate
 * auth layers" note: onboarding only ever proves "this token resolves to
 * this email/customerId", it never issues or sees this cookie).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  let result;
  try {
    result = await claimLoginToken(token)
  } catch {
    return NextResponse.redirect(new URL('/login?error=failed', req.url))
  }

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/login?error=${result.reason}`, req.url))
  }

  const sessionValue = await createSessionCookieValue(result.customerId, result.email)
  const response = NextResponse.redirect(new URL('/overview', req.url))
  response.cookies.set(SESSION_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })
  return response
}
