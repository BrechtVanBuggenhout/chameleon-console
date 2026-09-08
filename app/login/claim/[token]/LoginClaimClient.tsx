'use client'

import { useState } from 'react'

type State = { status: 'idle' } | { status: 'loading' }

/**
 * Reveal-on-click, same shape as app/claim/[token]/ClaimClient.tsx (the
 * analyst-credential flow) -- redemption only ever happens from this real
 * click, via the POST below, never from the emailed GET link itself. See
 * app/api/login/claim/[token]/route.ts for why that distinction matters.
 */
export function LoginClaimClient({ token }: { token: string }) {
  const [state, setState] = useState<State>({ status: 'idle' })

  async function signIn() {
    setState({ status: 'loading' })
    try {
      const res = await fetch(`/api/login/claim/${encodeURIComponent(token)}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        window.location.href = `/login?error=${data.reason ?? 'failed'}`
        return
      }
      window.location.href = '/overview'
    } catch {
      window.location.href = '/login?error=failed'
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-700">
        Click below to finish signing in. This link works once.
      </p>
      <button
        type="button"
        onClick={signIn}
        disabled={state.status === 'loading'}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50"
      >
        {state.status === 'loading' ? 'Signing in…' : 'Sign in'}
      </button>
    </div>
  )
}
