import { NextRequest, NextResponse } from 'next/server'
import { getActiveSession } from '@/lib/project-context'
import { listProjects, addProject, OnboardingNotConfiguredError } from '@/lib/onboarding-client'

/** GET /api/projects — this account's registered projects, for the switcher. */
export async function GET() {
  const session = await getActiveSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  try {
    const projects = await listProjects()
    return NextResponse.json({ projects })
  } catch (err) {
    if (err instanceof OnboardingNotConfiguredError) {
      return NextResponse.json({ projects: [] })
    }
    console.error('GET /api/projects: listProjects failed', err)
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 502 })
  }
}

/**
 * POST /api/projects — self-serve's manual "Add project" path: the
 * customer already ran bootstrap.sh themselves and is registering the
 * resulting connection details by hand. See onboarding's
 * /api/console-auth/projects for the real write.
 */
export async function POST(req: NextRequest) {
  const session = await getActiveSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  let body: Parameters<typeof addProject>[0]
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const project = await addProject(body)
    return NextResponse.json(project)
  } catch (err) {
    if (err instanceof OnboardingNotConfiguredError) {
      return NextResponse.json(
        { error: 'This console is not registered in the account system yet.' },
        { status: 503 }
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to add project'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
