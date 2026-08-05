import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from '@/lib/session'

export async function proxy(request: NextRequest) {
  const password = process.env.CONSOLE_PASSWORD

  // A real customer session (magic-link login) always grants access.
  const session = await verifySessionCookieValue(request.cookies.get(SESSION_COOKIE_NAME)?.value)
  if (session) return NextResponse.next()

  // No password configured and no session required — console is open.
  if (!password) return NextResponse.next()

  // Break-glass/operator path -- kept deliberately (see project-context.ts).
  const authCookie = request.cookies.get('console_auth')
  if (authCookie?.value === password) return NextResponse.next()

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  // claim/api/claim: the analyst clicking a one-time claim link doesn't have
  // (and shouldn't need) the console password. api/admin/analyst-claims: the
  // provisioner calls this with the shared Key Vault key as its own bearer
  // auth, not a browser session. api/login: the email-entry step of the
  // magic-link flow, called before any session exists.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|login|claim|api/claim|api/admin/analyst-claims|api/login).*)'],
}
