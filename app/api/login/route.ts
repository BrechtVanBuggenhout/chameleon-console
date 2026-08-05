import { NextRequest, NextResponse } from 'next/server'
import { requestLogin, OnboardingNotConfiguredError } from '@/lib/onboarding-client'

/**
 * Email-entry step of the magic-link flow. Always responds the same way
 * regardless of whether the email matched anything -- see onboarding's
 * /api/console-auth/login, which is the one that actually decides that.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email } = body
  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  try {
    await requestLogin(email, req.nextUrl.origin)
  } catch (err) {
    if (err instanceof OnboardingNotConfiguredError) {
      return NextResponse.json(
        { error: 'This console is not registered in the account system yet -- use operator access instead.' },
        { status: 503 }
      )
    }
    console.error('POST /api/login: requestLogin failed', err)
    // Same principle as onboarding's own login route: don't let a downstream
    // error distinguish "email exists" from "something went wrong" either.
  }

  return NextResponse.json({ ok: true })
}
