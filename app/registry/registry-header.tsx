'use client'

import { useCallback, useEffect, useState } from 'react'
import { DeclarePanel, type DeclareInitial } from './declare-panel'
import { TENANT_ID } from '@/lib/tenant'

type DiscoveryFinding = {
  resourceId: string
  system: string
  datasetId?: string
  tableId?: string
  registryStatus: 'UNREGISTERED' | 'DRIFTED'
  columns: string[]
  recommendedAction?: string
  lastSeen: string
}

export function RegistryHeader({ resourceCount }: { resourceCount: number }) {
  const [open, setOpen] = useState(false)
  const [initial, setInitial] = useState<DeclareInitial | undefined>(undefined)
  const [panelKey, setPanelKey] = useState(0)
  const [findings, setFindings] = useState<DiscoveryFinding[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const loadFindings = useCallback(async () => {
    try {
      const res = await fetch('/api/registry/discovery', { headers: { 'x-tenant-id': TENANT_ID } })
      const data = await res.json()
      return Array.isArray(data.findings) ? (data.findings as DiscoveryFinding[]) : []
    } catch {
      return []
    }
  }, [])

  // Fetch the discovery queue on mount. State is set in the awaited continuation
  // (guarded against unmount), not synchronously in the effect body.
  useEffect(() => {
    let active = true
    loadFindings().then((next) => {
      if (active) setFindings(next)
    })
    return () => {
      active = false
    }
  }, [loadFindings])

  const refreshFindings = useCallback(() => {
    loadFindings().then(setFindings)
  }, [loadFindings])

  function declareBlank() {
    setInitial(undefined)
    setPanelKey((k) => k + 1)
    setOpen(true)
  }

  async function syncNow() {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await fetch('/api/registry/sync-now', { method: 'POST', headers: { 'x-tenant-id': TENANT_ID } })
      const data = await res.json()
      if (!res.ok) {
        setSyncMessage(data.error ?? 'Sync failed')
        return
      }
      // The sync job now enumerates and fans out per-chunk work over
      // Pub/Sub instead of processing everything inline, so this response
      // is a queued count, not a final result -- actual encryption happens
      // moments later, off-screen.
      setSyncMessage(`Queued ${data.chunks_queued} ${data.chunks_queued === 1 ? 'chunk' : 'chunks'} across ${data.resources_queued} ${data.resources_queued === 1 ? 'resource' : 'resources'}`)
    } catch {
      setSyncMessage('Sync failed — could not reach Key Vault')
    } finally {
      setSyncing(false)
    }
  }

  function declareFromFinding(finding: DiscoveryFinding) {
    setInitial({
      tenantId: TENANT_ID,
      resourceId: finding.resourceId,
      system: finding.system,
      resourceLayer: 'RAW',
      columns: finding.columns,
    })
    setPanelKey((k) => k + 1)
    setOpen(true)
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registry</h1>
          <p className="mt-1 text-sm text-gray-500">
            PII resources declared across connected systems. {resourceCount} resources registered.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex gap-2">
            <button
              onClick={syncNow}
              disabled={syncing}
              className="rounded-md border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            <button
              onClick={declareBlank}
              className="rounded-md bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Declare PII dataset
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {syncMessage ?? 'Syncs automatically every day at 7:00 AM UTC'}
          </p>
        </div>
      </div>

      {findings.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-amber-900">
              {findings.length} discovered {findings.length === 1 ? 'table' : 'tables'} not yet declared
            </p>
            <span className="text-xs text-amber-700">Found by the warehouse scan</span>
          </div>
          <ul className="mt-3 space-y-2">
            {findings.map((finding) => (
              <li
                key={finding.resourceId}
                className="flex items-center justify-between gap-3 rounded border border-amber-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-gray-700">{finding.resourceId}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {finding.registryStatus === 'DRIFTED' ? 'Schema drift' : 'Unregistered'}
                    {finding.columns.length > 0 && <> · {finding.columns.slice(0, 6).join(', ')}</>}
                  </p>
                </div>
                <button
                  onClick={() => declareFromFinding(finding)}
                  className="shrink-0 rounded-md border border-gray-900 px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-900 hover:text-white"
                >
                  Declare
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && (
        <DeclarePanel key={panelKey} initial={initial} onClose={() => setOpen(false)} onDeclared={refreshFindings} />
      )}
    </>
  )
}
