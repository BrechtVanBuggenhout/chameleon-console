'use client'

import { useEffect, useState } from 'react'

type SyncRunStatus = 'enumerating' | 'running' | 'complete'

interface SyncRun {
  runId: string
  status: SyncRunStatus
  chunksTotal: number | null
  chunksCompleted: number
  chunksFailed: number
}

const POLL_INTERVAL_MS = 2000

/**
 * Polls GET /api/registry/sync-runs/:runId every ~2s until the run
 * reaches 'complete', rendering a real progress bar instead of the old
 * static "Queued N chunk(s)" message. 'enumerating' (the total isn't
 * known yet -- see SyncRunRepository in chameleon-key-vault) shows a
 * plain "counting" message rather than a 0%-stuck bar.
 */
export function SyncProgressBar({ runId }: { runId: string }) {
  const [run, setRun] = useState<SyncRun | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>

    async function poll() {
      try {
        const res = await fetch(`/api/registry/sync-runs/${encodeURIComponent(runId)}`, { cache: 'no-store' })
        const data = await res.json()
        if (!active) return
        if (!res.ok || !data.run) {
          setUnavailable(true)
          return
        }
        setRun(data.run as SyncRun)
        if (data.run.status !== 'complete') {
          timer = setTimeout(poll, POLL_INTERVAL_MS)
        }
      } catch {
        if (active) setUnavailable(true)
      }
    }

    poll()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [runId])

  if (unavailable) {
    return <p className="text-xs text-amber-600">Progress unavailable — the sync is still running in the background.</p>
  }
  if (!run || run.status === 'enumerating') {
    return <p className="text-xs text-gray-500">Counting rows to sync…</p>
  }

  const total = run.chunksTotal ?? 0
  const done = Math.min(run.chunksCompleted, total)
  const pct = total > 0 ? Math.round((done / total) * 100) : 100

  return (
    <div className="w-48">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${run.status === 'complete' ? 'bg-green-500' : 'bg-gray-900'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {run.status === 'complete'
          ? `Synced ${done} of ${total} ${total === 1 ? 'chunk' : 'chunks'}`
          : `${done} of ${total} ${total === 1 ? 'chunk' : 'chunks'} synced${run.chunksFailed > 0 ? ` (${run.chunksFailed} retrying)` : ''}`}
      </p>
    </div>
  )
}
