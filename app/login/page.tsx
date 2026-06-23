import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function login(formData: FormData) {
  'use server'
  const password = formData.get('password') as string
  const expected = process.env.CONSOLE_PASSWORD

  if (!expected || password === expected) {
    const cookieStore = await cookies()
    cookieStore.set('console_auth', password || '__open__', {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    redirect('/overview')
  }

  redirect('/login?error=1')
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Chameleon</h1>
          <p className="mt-1 text-sm text-gray-500">Demo console · Enter access password</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <form action={login} className="px-6 py-6">
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Incorrect password. Please try again.
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoFocus
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                placeholder="Enter console password"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              Access console
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Set{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5">CONSOLE_PASSWORD</code> in{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5">.env.local</code>
        </p>
      </div>
    </div>
  )
}
