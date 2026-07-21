import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const password = process.env.CONSOLE_PASSWORD

  // No password configured — console is open
  if (!password) return NextResponse.next()

  const authCookie = request.cookies.get('console_auth')

  if (authCookie?.value === password) return NextResponse.next()

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  // claim/api/claim: the analyst clicking a one-time claim link doesn't have
  // (and shouldn't need) the console password. api/admin/analyst-claims: the
  // provisioner calls this with the shared Key Vault key as its own bearer
  // auth, not a browser session -- see app/api/admin/analyst-claims/route.ts.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|login|claim|api/claim|api/admin/analyst-claims).*)'],
}
