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
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|login).*)'],
}
