'use client'

import { useState } from 'react'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'revealed'; apiKey: string; analystEmail: string }
  | { status: 'error'; message: string }

export function ClaimClient({ token }: { token: string }) {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [copied, setCopied] = useState(false)

  async function reveal() {
    setState({ status: 'loading' })
    try {
      const res = await fetch(`/api/claim/${encodeURIComponent(token)}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setState({
          status: 'error',
          message: data?.error ?? 'This claim link is invalid, expired, or already used.',
        })
        return
      }
      setState({ status: 'revealed', apiKey: data.apiKey, analystEmail: data.analystEmail })
    } catch {
      setState({ status: 'error', message: 'Something went wrong reaching the Key Vault. Try again in a moment.' })
    }
  }

  async function copy(apiKey: string) {
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (state.status === 'revealed') {
    return (
      <div>
        <p className="mb-3 text-sm text-gray-700">
          Your API credential for <span className="font-medium">{state.analystEmail}</span>. It won&rsquo;t be shown again.
        </p>
        <div className="mb-3 break-all rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-900">
          {state.apiKey}
        </div>
        <button
          type="button"
          onClick={() => copy(state.apiKey)}
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          {copied ? 'Copied' : 'Copy to clipboard'}
        </button>
        <p className="mt-3 text-xs text-gray-500">
          Send it as either an <code className="rounded bg-gray-100 px-1 py-0.5">X-Api-Key</code> header or an{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5">Authorization: Bearer</code> header when calling{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5">/encrypt</code> or{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5">/decrypt</code>. Treat it like a password.
        </p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div>
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </div>
        <p className="text-xs text-gray-500">
          Ask whoever set up your Chameleon access to send you a fresh link.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-700">
        Click below to reveal your personal Key Vault API credential. This can only be done once.
      </p>
      <button
        type="button"
        onClick={reveal}
        disabled={state.status === 'loading'}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50"
      >
        {state.status === 'loading' ? 'Revealing…' : 'Reveal my key'}
      </button>
    </div>
  )
}
