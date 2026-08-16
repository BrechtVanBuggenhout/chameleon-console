'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TENANT_ID } from '@/lib/tenant'
import { AffectedResourcesPanel } from './affected-resources'

type StepStatus = 'pending' | 'running' | 'done' | 'error'

type LookupState = 'idle' | 'checking' | 'active' | 'shredded' | 'not_found' | 'unknown'

interface KeyStatusResponse {
  status?: string
  shredAt?: string | null
  shred_at?: string | null
}

interface JanitorWipe {
  destination: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'DLQ'
  details?: { error?: string; [key: string]: unknown }
}

interface DeletionRequestResponse {
  status: string
  janitor_wipes?: JanitorWipe[]
  alreadyExisted?: boolean
}

// Covers two kinds of destination under one step, both gated the same way
// by the backend (see chameleon-key-vault's deletion-request-service.ts):
// real SaaS connector wipes (HubSpot, Salesforce) AND declared BigQuery
// resources with a source-redaction strategy (REDACT_IN_PLACE/SHADOW_COPY).
// A failure here can be either kind -- "destination" below may be a SaaS
// system name or a bigquery:... resourceId.
function summarizeWipes(wipes: JanitorWipe[] | undefined): string {
  if (!wipes || wipes.length === 0) return 'No downstream systems to wipe'
  const failed = wipes.filter(w => w.status === 'FAILED' || w.status === 'DLQ')
  if (failed.length === 0) return `${wipes.length} destination${wipes.length === 1 ? '' : 's'} wiped`
  // details.error is only populated for source-redaction failures today
  // (see source-redaction-service.ts) -- SaaS janitor failures don't carry
  // a message yet, so those still just show the destination name.
  return `Failed: ${failed.map(w => w.details?.error ? `${w.destination} (${w.details.error})` : w.destination).join(', ')}`
}

interface Step {
  id: string
  label: string
  system: string
  status: StepStatus
  detail?: string
  durationMs?: number
}

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
  { id: 'cascade', label: 'Downstream systems wiped', system: 'Key Vault', status: 'pending' },
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
  const [lookup, setLookup] = useState<LookupState>('idle')
  const [shredAt, setShredAt] = useState<string | null>(null)

  function patchStep(id: string, patch: Partial<Step>) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function handleUserIdChange(value: string) {
    setUserId(value)
    setLookup(value.trim() ? 'checking' : 'idle')
  }

  // Confirms the ID actually has a key on file before the operator can fire a
  // deletion at it -- catches typos (which would otherwise "succeed" against
  // nothing) and re-runs against an already-shredded user. Debounced and
  // fails open: a lookup error/timeout never blocks the trigger button, since
  // this is a confirmation aid, not a hard gate. The immediate 'checking'/'idle'
  // transition lives in handleUserIdChange (a real event handler) rather than
  // here, since setState synchronously in an effect body triggers cascading
  // renders -- this effect only ever sets state from inside the async fetch.
  useEffect(() => {
    const trimmed = userId.trim()
    if (!trimmed || running) return
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/key-status/${encodeURIComponent(trimmed)}`, {
          headers: { 'x-tenant-id': TENANT_ID },
          cache: 'no-store',
        })
        if (res.status === 404) {
          setLookup('not_found')
          return
        }
        if (!res.ok) {
          setLookup('unknown')
          return
        }
        const data = (await res.json()) as KeyStatusResponse
        if (data.status === 'SHREDDED') {
          setShredAt(data.shredAt ?? data.shred_at ?? null)
          setLookup('shredded')
        } else {
          setLookup('active')
        }
      } catch {
        setLookup('unknown')
      }
    }, 400)
    return () => clearTimeout(t)
  }, [userId, running])

  async function advanceRequest(id: string, newStatus: string, operationId: string) {
    const res = await fetch(`/api/deletion/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
      body: JSON.stringify({ newStatus, operationId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message ?? `Failed to advance to ${newStatus}`)
    }
    return res.json()
  }

  // CASCADE_PARTIAL_FAILURE is a real, stable terminal state (the backend
  // never auto-advances out of it). CASCADE_COMPLETE is NOT -- deletion-
  // request-service.ts's CASCADE_COMPLETE case always immediately recurses
  // into CERTIFICATE_ISSUED in the same call (or, if that step itself
  // throws, force-recovers into CASCADE_PARTIAL_FAILURE -- see its own
  // "never a silent stall" handling). So a poll that catches the document
  // at CASCADE_COMPLETE has just raced an in-flight transition, not found a
  // real resting state. Treating it as terminal here (previously) meant a
  // real, successfully-issued certificate could still get reported as
  // "certificate issuance failed" if the poll happened to land in that
  // narrow window -- confirmed live on Immoscoop 2026-08-17: a valid,
  // chained certificate existed in GCS for a request the console had
  // reported as failed.
  const TERMINAL_STATUSES = new Set(['CERTIFICATE_ISSUED', 'CASCADE_PARTIAL_FAILURE'])

  async function pollUntilComplete(id: string, timeoutMs = 20000): Promise<DeletionRequestResponse> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1000))
      const res = await fetch(`/api/deletion/${id}`, { headers: { 'x-tenant-id': TENANT_ID }, cache: 'no-store' })
      if (!res.ok) continue
      const data = (await res.json()) as DeletionRequestResponse
      if (TERMINAL_STATUSES.has(data.status)) return data
    }
    throw new Error('Timed out waiting for a cascade result — the request may still be running; check the Proof page shortly')
  }

  // Shared by a fresh request (CASCADE_PENDING) and a retry of a stuck one
  // (CASCADE_IN_PROGRESS, see deletion-request-service.ts) -- both trigger
  // the same cleanup loop on the backend, so the console shouldn't drift
  // from that by having two separate polling implementations.
  async function runCascade(reqId: string, operationId: string, triggerStatus: 'CASCADE_PENDING' | 'CASCADE_IN_PROGRESS') {
    patchStep('cascade', { status: 'running' })
    const t3 = Date.now()
    await advanceRequest(reqId, triggerStatus, operationId)
    const result = await pollUntilComplete(reqId)

    if (result.status === 'CASCADE_PARTIAL_FAILURE') {
      patchStep('cascade', { status: 'error', detail: summarizeWipes(result.janitor_wipes), durationMs: Date.now() - t3 })
      throw new Error('Cascade could not reach every destination — certificate withheld. See the failed step above.')
    }
    // result.status is now always CERTIFICATE_ISSUED here -- CASCADE_COMPLETE
    // is no longer in TERMINAL_STATUSES (see above), so pollUntilComplete
    // keeps polling straight through it to the real outcome.
    patchStep('cascade', { status: 'done', detail: summarizeWipes(result.janitor_wipes), durationMs: Date.now() - t3 })

    // Step 4 — certificate (auto-issued after cascade)
    patchStep('cert', { status: 'done', detail: `cert_${userId}` })
    setCompletedAt(Date.now())
  }

  // POST /api/deletion is idempotent: submitting the same userId again
  // returns whatever request already exists instead of erroring (see
  // alreadyExisted on the create response). Before this fix, the console
  // ignored that flag entirely and blindly tried to advance the returned
  // request straight to KEY_DESTROYED -- which the backend correctly
  // rejects once a request is already past that point, surfacing as a
  // confusing "Invalid state transition" error with no way to actually
  // retry a stuck (CASCADE_PARTIAL_FAILURE) request. This resumes from
  // wherever the existing request actually is instead.
  async function resumeExistingRequest(reqId: string, status: string, operationId: string) {
    const keyAlreadyDestroyed = status !== 'SHRED_REQUESTED'
    if (keyAlreadyDestroyed) {
      patchStep('key', { status: 'done', detail: 'Already destroyed in a previous attempt' })
    }

    switch (status) {
      case 'SHRED_REQUESTED': {
        // Only reachable if a previous attempt died between create and key
        // destruction (e.g. a concurrent request) -- pick up from here.
        patchStep('key', { status: 'running' })
        const t2 = Date.now()
        await advanceRequest(reqId, 'KEY_DESTROYED', operationId)
        patchStep('key', { status: 'done', detail: 'KMS key version destroyed — data is now unreadable', durationMs: Date.now() - t2 })
        await runCascade(reqId, operationId, 'CASCADE_PENDING')
        return
      }
      case 'KEY_DESTROYED':
        // Key destroyed, cascade never triggered -- start it now.
        await runCascade(reqId, operationId, 'CASCADE_PENDING')
        return
      case 'CASCADE_PENDING':
      case 'CASCADE_IN_PROGRESS': {
        // A cascade is already running from a previous or concurrent call
        // -- don't trigger a second one, just wait for the one already
        // in flight to land.
        patchStep('cascade', { status: 'running' })
        const t3 = Date.now()
        const result = await pollUntilComplete(reqId)
        if (result.status === 'CASCADE_PARTIAL_FAILURE') {
          patchStep('cascade', { status: 'error', detail: summarizeWipes(result.janitor_wipes), durationMs: Date.now() - t3 })
          throw new Error('Cascade could not reach every destination — certificate withheld. See the failed step above.')
        }
        patchStep('cascade', { status: 'done', detail: summarizeWipes(result.janitor_wipes), durationMs: Date.now() - t3 })
        patchStep('cert', { status: 'done', detail: `cert_${userId}` })
        setCompletedAt(Date.now())
        return
      }
      case 'CASCADE_PARTIAL_FAILURE':
        // The actual retry path this fix adds: re-run the cleanup loop
        // instead of colliding with a from-scratch request.
        await runCascade(reqId, operationId, 'CASCADE_IN_PROGRESS')
        return
      case 'CASCADE_COMPLETE':
        // Rare: every destination succeeded but certificate issuance itself
        // failed previously. Retry just that step.
        patchStep('cascade', { status: 'done', detail: 'Already wiped in a previous attempt' })
        await advanceRequest(reqId, 'CERTIFICATE_ISSUED', operationId)
        patchStep('cert', { status: 'done', detail: `cert_${userId}` })
        setCompletedAt(Date.now())
        return
      case 'CERTIFICATE_ISSUED':
        patchStep('cascade', { status: 'done', detail: 'Already wiped in a previous attempt' })
        patchStep('cert', { status: 'done', detail: `cert_${userId}` })
        setCompletedAt(Date.now())
        return
      default:
        throw new Error(`Existing deletion request is in an unexpected state: ${status}`)
    }
  }

  async function handleTrigger() {
    if (!userId.trim()) return
    setRunning(true)
    setLookup('idle')
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
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ userId, operationId }),
      })
      if (!createRes.ok) {
        const err = (await createRes.json().catch(() => ({}))) as { message?: string; statusCode?: number }
        throw new Error(err.message ?? 'Failed to create deletion request')
      }
      const created = (await createRes.json()) as {
        deletionRequestId?: string
        deletion_request_id?: string
        status?: string
        alreadyExisted?: boolean
      }
      const reqId = created.deletionRequestId ?? created.deletion_request_id ?? ''
      setDeletionRequestId(reqId)

      if (created.alreadyExisted) {
        patchStep('create', { status: 'done', detail: `${reqId} (existing request)`, durationMs: Date.now() - t1 })
        await resumeExistingRequest(reqId, created.status ?? '', operationId)
        return
      }
      patchStep('create', { status: 'done', detail: reqId, durationMs: Date.now() - t1 })

      // Step 2 — destroy encryption key
      patchStep('key', { status: 'running' })
      const t2 = Date.now()
      await advanceRequest(reqId, 'KEY_DESTROYED', operationId)
      patchStep('key', { status: 'done', detail: 'KMS key version destroyed — data is now unreadable', durationMs: Date.now() - t2 })

      // Step 3 — trigger the cascade: real SaaS wipes plus any declared
      // BigQuery source-redaction (auto-completes if neither applies)
      await runCascade(reqId, operationId, 'CASCADE_PENDING')
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
          User deletion lifecycle — key destruction, downstream wipes, and proof issuance.
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
                onChange={e => handleUserIdChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookup !== 'not_found' && lookup !== 'shredded' && handleTrigger()}
                placeholder="e.g. usr-001"
                disabled={running}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <p className="mt-1 text-xs text-gray-400">
                The identifier from your own system used when this user&apos;s PII was ingested — usually your database&apos;s primary key. Not an email or name.
              </p>
            </div>
            <button
              onClick={handleTrigger}
              disabled={running || !userId.trim() || lookup === 'not_found' || lookup === 'shredded'}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {running ? 'Running…' : 'Trigger deletion'}
            </button>
          </div>

          {!running && userId.trim() && (
            <div className="mt-2">
              {lookup === 'checking' && (
                <p className="text-xs text-gray-400">Checking…</p>
              )}
              {lookup === 'active' && (
                <p className="text-xs text-green-600">✓ Record found — ready to delete</p>
              )}
              {lookup === 'not_found' && (
                <p className="text-xs text-red-600">
                  ✗ No record found for this ID — double check it against your own system, not a name or email
                </p>
              )}
              {lookup === 'shredded' && (
                <p className="text-xs text-yellow-600">
                  ⚠ Already deleted{shredAt ? ` on ${new Date(shredAt).toLocaleDateString()}` : ''} —{' '}
                  <button
                    onClick={() => router.push(`/proof?userId=${encodeURIComponent(userId)}`)}
                    className="underline hover:no-underline"
                  >
                    view certificate
                  </button>
                </p>
              )}
              {lookup === 'unknown' && (
                <p className="text-xs text-gray-400">Couldn&apos;t verify this ID — you can still proceed</p>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              ⚠ {error}
            </p>
          )}

          <AffectedResourcesPanel />
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
