'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type StepStatus = 'pending' | 'running' | 'done' | 'error'

interface Step {
  id: string
  label: string
  system: string
  status: StepStatus
  detail?: string
  durationMs?: number
}

const DEMO_USERS = ['usr-001', 'usr-002', 'usr-003', 'usr-004', 'usr-005']

const systemColors: Record<string, string> = {
  'Key Vault': 'bg-indigo-100 text-indigo-700',
  BigQuery: 'bg-blue-100 text-blue-700',
  Salesforce: 'bg-sky-100 text-sky-700',
  HubSpot: 'bg-orange-100 text-orange-700',
}

function StepRow({ step, index }: { step: Step; index: number }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <span
        className={[
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          step.status === 'done' ? 'bg-green-100 text-green-700' : '',
          step.status === 'running' ? 'bg-yellow-100 text-yellow-700 animate-pulse' : '',
          step.status === 'pending' ? 'bg-gray-100 text-gray-400' : '',
          step.status === 'error' ? 'bg-red-100 text-red-700' : '',
        ].join(' ')}
      >
        {step.status === 'done' ? '✓' : step.status === 'error' ? '✗' : index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>
          {step.label}
        </p>
        {step.detail && (
          <p className="text-xs text-gray-400 font-mono truncate">{step.detail}</p>
        )}
      </div>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${systemColors[step.system] ?? 'bg-gray-100 text-gray-600'}`}>
        {step.system}
      </span>
      {step.durationMs !== undefined && (
        <span className="w-14 text-right text-xs tabular-nums text-gray-400">
          {step.durationMs >= 1000 ? `${(step.durationMs / 1000).toFixed(1)}s` : `${step.durationMs}ms`}
        </span>
      )}
      <span className={[
        'w-20 text-right text-xs font-medium',
        step.status === 'done' ? 'text-green-600' : '',
        step.status === 'running' ? 'text-yellow-600' : '',
        step.status === 'pending' ? 'text-gray-300' : '',
        step.status === 'error' ? 'text-red-600' : '',
      ].join(' ')}>
        {step.status === 'done' ? 'Complete'
          : step.status === 'running' ? 'Running…'
          : step.status === 'error' ? 'Failed'
          : 'Pending'}
      </span>
    </div>
  )
}

const INITIAL_STEPS: Step[] = [
  { id: 'create', label: 'Deletion request created', system: 'Key Vault', status: 'pending' },
  { id: 'key', label: 'Encryption key destroyed', system: 'Key Vault', status: 'pending' },
  { id: 'cascade', label: 'SaaS systems wiped', system: 'Key Vault', status: 'pending' },
  { id: 'cert', label: 'Certificate of destruction issued', system: 'Key Vault', status: 'pending' },
]

export default function DeletionPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [running, setRunning] = useState(false)
  const [deletionRequestId, setDeletionRequestId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [completedAt, setCompletedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS)

  function patchStep(id: string, patch: Partial<Step>) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  async function advanceRequest(id: string, newStatus: string, operationId: string) {
    const res = await fetch(`/api/deletion/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'default-tenant' },
      body: JSON.stringify({ newStatus, operationId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message ?? `Failed to advance to ${newStatus}`)
    }
    return res.json()
  }

  async function pollUntilComplete(id: string, timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1000))
      const res = await fetch(`/api/deletion/${id}`, { cache: 'no-store' })
      if (!res.ok) continue
      const data = (await res.json()) as { status: string }
      if (data.status === 'CERTIFICATE_ISSUED') return data
    }
    throw new Error('Timed out waiting for certificate issuance')
  }

  async function handleTrigger() {
    if (!userId.trim()) return
    setRunning(true)
    setError(null)
    setCompletedAt(null)
    setDeletionRequestId(null)
    const t0 = Date.now()
    setStartedAt(t0)
    setSteps(INITIAL_STEPS)

    try {
      // Step 1 — create deletion request
      patchStep('create', { status: 'running' })
      const t1 = Date.now()
      const operationId = crypto.randomUUID()
      const createRes = await fetch('/api/deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'default-tenant' },
        body: JSON.stringify({ userId, operationId }),
      })
      if (!createRes.ok) {
        const err = (await createRes.json().catch(() => ({}))) as { message?: string; statusCode?: number }
        if (createRes.status === 409) {
          throw new Error(`A deletion is already in progress for ${userId}. Check the Proof page for its status.`)
        }
        throw new Error(err.message ?? 'Failed to create deletion request')
      }
      const created = (await createRes.json()) as { deletionRequestId?: string; deletion_request_id?: string }
      const reqId = created.deletionRequestId ?? created.deletion_request_id ?? ''
      setDeletionRequestId(reqId)
      patchStep('create', { status: 'done', detail: reqId, durationMs: Date.now() - t1 })

      // Step 2 — destroy encryption key
      patchStep('key', { status: 'running' })
      const t2 = Date.now()
      await advanceRequest(reqId, 'KEY_DESTROYED', operationId)
      patchStep('key', { status: 'done', detail: 'KMS key version destroyed — data is now unreadable', durationMs: Date.now() - t2 })

      // Step 3 — trigger SaaS cascade (auto-completes if no SaaS destinations)
      patchStep('cascade', { status: 'running' })
      const t3 = Date.now()
      await advanceRequest(reqId, 'CASCADE_PENDING', operationId)
      await pollUntilComplete(reqId)
      patchStep('cascade', { status: 'done', detail: 'No external SaaS destinations registered', durationMs: Date.now() - t3 })

      // Step 4 — certificate (auto-issued after cascade)
      patchStep('cert', { status: 'done', detail: `cert_${userId}` })
      setCompletedAt(Date.now())
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s))
    } finally {
      setRunning(false)
    }
  }

  const totalMs = completedAt && startedAt ? completedAt - startedAt : null
  const isComplete = steps.every(s => s.status === 'done')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Deletion</h1>
        <p className="mt-1 text-sm text-gray-500">
          User deletion lifecycle — key destruction, SaaS wipes, and proof issuance.
        </p>
      </div>

      {/* Trigger form */}
      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Trigger deletion</h2>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-sm">
              <label htmlFor="userId" className="block text-xs font-medium text-gray-700 mb-1">
                User identifier
              </label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTrigger()}
                placeholder="e.g. usr-001"
                disabled={running}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            <button
              onClick={handleTrigger}
              disabled={running || !userId.trim()}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {running ? 'Running…' : 'Trigger deletion'}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Demo users:</span>
            {DEMO_USERS.map(u => (
              <button
                key={u}
                onClick={() => setUserId(u)}
                disabled={running}
                className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                {u}
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              ⚠ {error}
            </p>
          )}
        </div>
      </div>

      {/* Execution timeline — only shown once a run has started */}
      {(deletionRequestId || running) && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Execution log — {userId}
              </h2>
              {deletionRequestId && (
                <p className="mt-0.5 font-mono text-xs text-gray-400">{deletionRequestId}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isComplete ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  Complete
                </span>
              ) : running ? (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 animate-pulse">
                  Running
                </span>
              ) : null}
              {totalMs !== null && (
                <span className="text-xs text-gray-400">
                  {totalMs >= 1000 ? `${(totalMs / 1000).toFixed(1)}s` : `${totalMs}ms`} total
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {steps.map((step, i) => (
              <StepRow key={step.id} step={step} index={i} />
            ))}
          </div>

          {isComplete && (
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                All data for <span className="font-mono font-medium">{userId}</span> is now cryptographically inaccessible.
              </p>
              <button
                onClick={() => router.push(`/proof?userId=${encodeURIComponent(userId)}`)}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
              >
                View certificate →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
