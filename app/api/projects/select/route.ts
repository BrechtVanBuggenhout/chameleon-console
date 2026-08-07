import { NextRequest, NextResponse } from 'next/server'
import { getActiveSession, SELECTED_PROJECT_COOKIE } from '@/lib/project-context'

/** POST /api/projects/select — { projectId } switches the active project. */
export async function POST(req: NextRequest) {
  const session = await getActiveSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  let body: { projectId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SELECTED_PROJECT_COOKIE, body.projectId, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
  return response
}
