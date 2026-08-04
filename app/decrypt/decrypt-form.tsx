'use client'

import { useMemo, useState } from 'react'
import type { RegistryResource } from '@/lib/fixtures'
import { TENANT_ID } from '@/lib/tenant'

type Status = 'idle' | 'loading' | 'found' | 'not_found' | 'error'

export function DecryptForm({ resources }: { resources: RegistryResource[] }) {
  const [resourceId, setResourceId] = useState('')
  const [userId, setUserId] = useState('')
  const [fieldName, setFieldName] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [value, setValue] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const selectedResource = useMemo(
    () => resources.find(r => r.resourceId === resourceId),
    [resources, resourceId]
  )
  const availableFields = selectedResource?.piiColumns ?? []

  function handleResourceChange(next: string) {
    setResourceId(next)
    setFieldName('')
  }

  async function handleDecrypt() {
    if (!resourceId || !userId.trim() || !fieldName) return
    setStatus('loading')
    setError(null)
    setValue(null)
    setRevealed(false)

    try {
      const res = await fetch('/api/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ userId: userId.trim(), resourceId, fieldName }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Decrypt request failed')
      }
      const data = (await res.json()) as { value: string | null }
      setValue(data.value)
      setStatus(data.value === null ? 'not_found' : 'found')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  const canSubmit = !!resourceId && !!userId.trim() && !!fieldName && status !== 'loading'

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Look up a value</h2>
      </div>
      <div className="px-5 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="resourceId" className="block text-xs font-medium text-gray-700 mb-1">
              Resource
            </label>
            <select
              id="resourceId"
              value={resourceId}
              onChange={e => handleResourceChange(e.target.value)}
              disabled={status === 'loading'}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Select a declared resource…</option>
              {resources.map(r => (
                <option key={r.resourceId} value={r.resourceId}>
                  {r.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="fieldName" className="block text-xs font-medium text-gray-700 mb-1">
              Field
            </label>
            <select
              id="fieldName"
              value={fieldName}
              onChange={e => setFieldName(e.target.value)}
              disabled={!selectedResource || status === 'loading'}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {selectedResource ? 'Select a field…' : 'Select a resource first'}
              </option>
              {availableFields.map(f => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="userId" className="block text-xs font-medium text-gray-700 mb-1">
              User identifier
            </label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSubmit && handleDecrypt()}
              placeholder="e.g. usr-001"
              disabled={status === 'loading'}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleDecrypt}
            disabled={!canSubmit}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'loading' ? 'Looking up…' : 'Decrypt'}
          </button>
          <p className="text-xs text-gray-400">
            Every lookup — found or not — is recorded in the audit trail.
          </p>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            ⚠ {error}
          </p>
        )}

        {status === 'not_found' && (
          <p className="mt-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600">
            No value found for this resource, field, and user — check the identifier, or the user may not have data
            here yet.
          </p>
        )}

        {status === 'found' && value !== null && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-700">
              Decrypted value — this lookup has been logged
            </p>
            {revealed ? (
              <p className="font-mono text-sm text-gray-900 break-all">{value}</p>
            ) : (
              <button
                onClick={() => setRevealed(true)}
                className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm hover:bg-amber-100 transition-colors"
              >
                Reveal
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
