'use client'

import { useState } from 'react'

type ChainResult = {
  depth: number
  complete: boolean
  brokenAtHash?: string | null
  note?: string
}

type VerifyResult =
  | { verified: true; payload: Record<string, unknown>; chain: ChainResult }
  | { verified: false; error: string }

type Status = 'idle' | 'loading' | 'done' | 'error'

export function VerifyForm() {
  const [jwt, setJwt] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)

  async function handleVerify() {
    if (!jwt.trim()) return
    setStatus('loading')
    setResult(null)
    setRequestError(null)
    try {
      const res = await fetch('/api/verify-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwt: jwt.trim() }),
      })
      const data = (await res.json()) as VerifyResult
      setResult(data)
      setStatus('done')
    } catch (err: unknown) {
      setRequestError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Paste a certificate</h2>
        </div>
        <div className="px-5 py-4">
          <textarea
            value={jwt}
            onChange={(e) => setJwt(e.target.value)}
            rows={4}
            placeholder="eyJhbGciOiJQUzI1NiIs..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleVerify}
            disabled={!jwt.trim() || status === 'loading'}
            className="mt-3 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'loading' ? 'Verifying…' : 'Verify signature'}
          </button>
        </div>
      </div>

      {requestError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Request failed: {requestError}
        </div>
      )}

      {result && !result.verified && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-800">❌ Not verified</p>
          <p className="mt-1 text-sm text-red-700">{result.error}</p>
        </div>
      )}

      {result && result.verified && (
        <div className="overflow-hidden rounded-lg border border-green-200 bg-white shadow-sm">
          <div className="border-b border-green-200 bg-green-50 px-5 py-4">
            <p className="text-sm font-semibold text-green-800">✅ Signature verified</p>
            <p className="mt-1 text-xs text-green-700">
              {result.chain.complete
                ? `${result.chain.depth} certificate(s) confirmed${result.chain.note ? ` — ${result.chain.note}` : ' back to the first certificate in this chain'}.`
                : `Chain broken at hash ${result.chain.brokenAtHash?.slice(0, 12)}… — ${result.chain.depth} certificate(s) confirmed before the break.`}
            </p>
          </div>
          <dl className="divide-y divide-gray-100">
            {Object.entries(result.payload)
              .filter(([key]) => !['iat', 'exp'].includes(key))
              .map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-4 px-5 py-2.5">
                  <dt className="shrink-0 font-mono text-xs text-gray-500">{key}</dt>
                  <dd className="break-all text-right font-mono text-xs text-gray-800">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </dd>
                </div>
              ))}
          </dl>
        </div>
      )}
    </div>
  )
}
