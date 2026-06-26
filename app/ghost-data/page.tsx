'use client'

import { useState } from 'react'
import Link from 'next/link'

type GhostFinding = {
  id: string
  resource: string
  displayName: string
  column: string
  pattern: string
  count: number
  recommendedAction: 'register_column' | 'remove_source_data'
}

const initialFindings: GhostFinding[] = [
  {
    id: 'ghost-001',
    resource: 'bigquery:chameleon-dev.chameleon_dev.marketing_events',
    displayName: 'marketing_events',
    column: 'user_email',
    pattern: 'EMAIL_PATTERN',
    count: 14832,
    recommendedAction: 'register_column',
  },
  {
    id: 'ghost-002',
    resource: 'bigquery:chameleon-dev.chameleon_dev.analytics_sessions',
    displayName: 'analytics_sessions',
    column: 'raw_user_agent',
    pattern: 'DEVICE_ID_PATTERN',
    count: 891441,
    recommendedAction: 'remove_source_data',
  },
  {
    id: 'ghost-003',
    resource: 'bigquery:chameleon-dev.chameleon_dev.int_customer_metrics',
    displayName: 'int_customer_metrics',
    column: 'raw_email',
    pattern: 'EMAIL_PATTERN',
    count: 2901,
    recommendedAction: 'register_column',
  },
]

const classificationOptions = [
  { value: 'DIRECT_IDENTIFIER', label: 'Direct identifier', description: 'Directly identifies a person (email, SSN, full name)' },
  { value: 'CONTACT', label: 'Contact info', description: 'Phone, address, etc.' },
  { value: 'QUASI_IDENTIFIER', label: 'Quasi-identifier', description: 'Indirectly identifies when combined with other data' },
  { value: 'BEHAVIORAL', label: 'Behavioral', description: 'Usage patterns, clicks, session data' },
  { value: 'SYSTEM_IDENTIFIER', label: 'System identifier', description: 'Internal IDs like user_id or session_id' },
]

const strategyOptions = [
  { value: 'CRYPTO_SHRED', label: 'Crypto-shred', description: 'Destroy encryption key — data becomes unreadable instantly' },
  { value: 'MANUAL_REVIEW', label: 'Manual review', description: 'Flag for human review before deletion' },
]

const handlingOptions = [
  { value: 'ENCRYPT', label: 'Encrypt' },
  { value: 'TOKENIZE', label: 'Tokenize' },
  { value: 'HASH_SURROGATE', label: 'Hash surrogate' },
]

function formatCount(n: number) {
  return n.toLocaleString('en-US')
}

type ResolvedEntry = { id: string; action: 'registered' | 'removed' }

export default function GhostDataPage() {
  const [findings, setFindings] = useState<GhostFinding[]>(initialFindings)
  const [resolved, setResolved] = useState<ResolvedEntry[]>([])
  const [registerTarget, setRegisterTarget] = useState<GhostFinding | null>(null)
  const [removeTarget, setRemoveTarget] = useState<GhostFinding | null>(null)

  // Register form state
  const [classification, setClassification] = useState('DIRECT_IDENTIFIER')
  const [strategy, setStrategy] = useState('CRYPTO_SHRED')
  const [handling, setHandling] = useState('ENCRYPT')
  const [registering, setRegistering] = useState(false)

  function openRegister(finding: GhostFinding) {
    setClassification('DIRECT_IDENTIFIER')
    setStrategy('CRYPTO_SHRED')
    setHandling('ENCRYPT')
    setRegisterTarget(finding)
  }

  function confirmRegister() {
    if (!registerTarget) return
    setRegistering(true)
    setTimeout(() => {
      setFindings(prev => prev.filter(f => f.id !== registerTarget.id))
      setResolved(prev => [...prev, { id: registerTarget.id, action: 'registered' }])
      setRegisterTarget(null)
      setRegistering(false)
    }, 800)
  }

  function confirmRemove() {
    if (!removeTarget) return
    setFindings(prev => prev.filter(f => f.id !== removeTarget.id))
    setResolved(prev => [...prev, { id: removeTarget.id, action: 'removed' }])
    setRemoveTarget(null)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ghost Data</h1>
        <p className="mt-1 text-sm text-gray-500">
          PII detected in the warehouse that is not declared in the registry.{' '}
          {findings.length} finding{findings.length !== 1 ? 's' : ''} remaining.
        </p>
      </div>

      {findings.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>
            These columns contain PII patterns but are not registered. Resolve each finding by
            declaring the column in the registry or removing the underlying source data.
          </span>
        </div>
      )}

      {resolved.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span className="mt-0.5 shrink-0">✓</span>
          <span>
            {resolved.length} finding{resolved.length !== 1 ? 's' : ''} resolved.{' '}
            {resolved.some(r => r.action === 'registered') && (
              <>
                Registered columns are now tracked in the registry —{' '}
                <Link href="/deletion" className="font-semibold underline">
                  shred affected users →
                </Link>
              </>
            )}
          </span>
        </div>
      )}

      {findings.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-8 py-16 text-center shadow-sm">
          <p className="text-2xl mb-2">✓</p>
          <p className="text-sm font-medium text-gray-900">All ghost data resolved</p>
          <p className="mt-1 text-sm text-gray-500">No unregistered PII columns detected.</p>
          <Link
            href="/deletion"
            className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Shred affected users →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Resource</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Column</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Pattern</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Affected rows</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {findings.map((finding) => (
                <tr key={finding.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{finding.displayName}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-400">{finding.resource}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">
                      {finding.column}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                      {finding.pattern}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-sm tabular-nums text-gray-900">
                    {formatCount(finding.count)}
                  </td>
                  <td className="px-5 py-3">
                    {finding.recommendedAction === 'register_column' ? (
                      <button
                        onClick={() => openRegister(finding)}
                        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 hover:bg-blue-100 cursor-pointer"
                      >
                        Register column
                      </button>
                    ) : (
                      <button
                        onClick={() => setRemoveTarget(finding)}
                        className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 cursor-pointer"
                      >
                        Remove source data
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register column slide-over */}
      {registerTarget && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setRegisterTarget(null)} />
          <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Register column</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Declare this column in the PII registry with a handling policy.
                </p>
              </div>
              <button
                onClick={() => setRegisterTarget(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Resource + column (read-only) */}
              <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Table</span>
                  <span className="font-mono text-gray-800">{registerTarget.displayName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Column</span>
                  <span className="font-mono text-gray-800">{registerTarget.column}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Detected pattern</span>
                  <span className="font-mono text-gray-800">{registerTarget.pattern}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Affected rows</span>
                  <span className="font-mono text-gray-800">{formatCount(registerTarget.count)}</span>
                </div>
              </div>

              {/* Classification */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  PII classification
                </label>
                <div className="space-y-2">
                  {classificationOptions.map(opt => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        classification === opt.value
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="classification"
                        value={opt.value}
                        checked={classification === opt.value}
                        onChange={() => setClassification(opt.value)}
                        className="mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Handling */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Data handling
                </label>
                <div className="flex gap-2">
                  {handlingOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setHandling(opt.value)}
                      className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                        handling === opt.value
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deletion strategy */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Deletion strategy
                </label>
                <div className="space-y-2">
                  {strategyOptions.map(opt => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        strategy === opt.value
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="strategy"
                        value={opt.value}
                        checked={strategy === opt.value}
                        onChange={() => setStrategy(opt.value)}
                        className="mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => setRegisterTarget(null)}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRegister}
                disabled={registering}
                className="flex-1 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
              >
                {registering ? 'Registering…' : 'Register column'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove source data confirmation */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setRemoveTarget(null)} />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">Remove source data?</h2>
            <p className="mt-2 text-sm text-gray-500">
              This will mark{' '}
              <span className="font-mono text-gray-800">
                {removeTarget.displayName}.{removeTarget.column}
              </span>{' '}
              for deletion. The underlying data ({formatCount(removeTarget.count)} rows) should be
              dropped from the warehouse to resolve this finding.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setRemoveTarget(null)}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Mark for removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
