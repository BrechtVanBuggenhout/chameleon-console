'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DeclarePanel, type DeclareInitial } from '@/app/registry/declare-panel'
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

function displayName(finding: DiscoveryFinding) {
  return finding.tableId ?? finding.resourceId.split('.').pop() ?? finding.resourceId
}

function formatTs(ts: string) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function GhostDataPage() {
  const [findings, setFindings] = useState<DiscoveryFinding[]>([])
  const [loading, setLoading] = useState(true)
  const [declaredCount, setDeclaredCount] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelInitial, setPanelInitial] = useState<DeclareInitial | undefined>(undefined)
  const [panelKey, setPanelKey] = useState(0)

  const loadFindings = useCallback(async () => {
    try {
      const res = await fetch('/api/registry/discovery', { headers: { 'x-tenant-id': TENANT_ID } })
      const data = await res.json()
      return Array.isArray(data.findings) ? (data.findings as DiscoveryFinding[]) : []
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    let active = true
    loadFindings().then((next) => {
      if (active) {
        setFindings(next)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [loadFindings])

  function declareFromFinding(finding: DiscoveryFinding) {
    setPanelInitial({
      tenantId: TENANT_ID,
      resourceId: finding.resourceId,
      system: finding.system,
      resourceLayer: 'RAW',
      columns: finding.columns,
    })
    setPanelKey((k) => k + 1)
    setPanelOpen(true)
  }

  function handleDeclared() {
    setDeclaredCount((n) => n + 1)
    loadFindings().then(setFindings)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ghost Data</h1>
        <p className="mt-1 text-sm text-gray-500">
          Warehouse tables with PII-shaped columns that are not declared in the registry.
          Found by the daily warehouse scan.
          {!loading && <> {findings.length} finding{findings.length !== 1 ? 's' : ''} open.</>}
        </p>
      </div>

      {findings.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>
            These tables hold PII outside the registry, so nothing guarantees their data is
            crypto-shreddable. Declare each table to bring it under policy, or drop the data
            at the source and let the next scan clear the finding.
          </span>
        </div>
      )}

      {declaredCount > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span className="mt-0.5 shrink-0">✓</span>
          <span>
            {declaredCount} finding{declaredCount !== 1 ? 's' : ''} declared — now tracked in the{' '}
            <Link href="/registry" className="font-semibold underline">
              registry →
            </Link>
          </span>
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white px-8 py-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">Loading findings…</p>
        </div>
      ) : findings.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-8 py-16 text-center shadow-sm">
          <p className="text-2xl mb-2">✓</p>
          <p className="text-sm font-medium text-gray-900">No ghost data detected</p>
          <p className="mt-1 text-sm text-gray-500">
            The latest warehouse scan found no undeclared PII columns.
          </p>
          <Link
            href="/registry"
            className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            View registry →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Resource</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Flagged columns</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Last seen</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {findings.map((finding) => (
                <tr key={finding.resourceId} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{displayName(finding)}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-400">{finding.resourceId}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        finding.registryStatus === 'DRIFTED'
                          ? 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20'
                          : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
                      }`}
                    >
                      {finding.registryStatus === 'DRIFTED' ? 'Schema drift' : 'Unregistered'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {finding.columns.length > 0 ? (
                      <div className="flex max-w-md flex-wrap gap-1">
                        {finding.columns.slice(0, 6).map((col) => (
                          <span key={col} className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">
                            {col}
                          </span>
                        ))}
                        {finding.columns.length > 6 && (
                          <span className="text-xs text-gray-400">+{finding.columns.length - 6} more</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{formatTs(finding.lastSeen)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => declareFromFinding(finding)}
                      className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 hover:bg-blue-100 cursor-pointer"
                    >
                      Declare in registry
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {panelOpen && (
        <DeclarePanel key={panelKey} initial={panelInitial} onClose={() => setPanelOpen(false)} onDeclared={handleDeclared} />
      )}
    </div>
  )
}
