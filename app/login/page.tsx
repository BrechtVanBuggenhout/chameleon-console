'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  expired: 'That login link expired. Request a new one below.',
  already_claimed: 'That login link was already used. Request a new one below.',
  not_found: "That login link isn't valid. Request a new one below.",
  no_account: 'No account was found for that link. Request a new one below.',
  failed: 'Something went wrong logging you in. Try again below.',
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } finally {
      setSubmitting(false)
      // Always show the same confirmation, whether or not the email
      // matched an account -- see app/api/login/route.ts.
      setSubmitted(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Chameleon</h1>
          <p className="mt-1 text-sm text-gray-500">Log in to your account</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {submitted ? (
            <div className="px-6 py-6 text-center text-sm text-gray-700">
              If that email is registered, a login link is on its way. It
              works once and expires in 15 minutes.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-6">
              {errorParam && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.failed}
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  placeholder="you@company.com"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send login link'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          <a href="/login/operator" className="underline hover:text-gray-600">Operator access</a>
        </p>
      </div>
    </div>
  )
}
