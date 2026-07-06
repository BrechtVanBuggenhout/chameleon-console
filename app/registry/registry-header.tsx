'use client'

import { useCallback, useEffect, useState } from 'react'
import { DeclarePanel, type DeclareInitial } from './declare-panel'

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

  const loadFindings = useCallback(async () => {
    try {
      const res = await fetch('/api/registry/discovery', { headers: { 'x-tenant-id': 'default-tenant' } })
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

  function declareFromFinding(finding: DiscoveryFinding) {
    setInitial({
      tenantId: 'default-tenant',
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
        <button
          onClick={declareBlank}
          className="shrink-0 rounded-md bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Declare PII dataset
        </button>
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
