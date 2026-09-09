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

// Stage 2 (path-level) content scanning -- the strictly stronger tier.
// Unlike DiscoveryFinding above (a column NAME that merely looks like it
// might hold PII, from a pure INFORMATION_SCHEMA crawl that never reads a
// row), a ContentConfirmedFinding means chameleon-pii-dbt's content scanner
// actually found a real PII VALUE at this exact JSON path. See
// chameleon-key-vault's PiiContentFindingsLookupService for the full story
// of why some real JSON-column PII still can't get a path (a BigQuery
// addressing limitation for keys with special characters) -- those still
// show up only in the schema-level tier below, not here.
type ContentConfirmedFinding = {
  resourceId: string
  columnName: string
  jsonPath: string
  classification: string
  pattern: string
  matchCount: number
  sampledRows: number
  scannedAt: string
}

function displayName(finding: DiscoveryFinding) {
  return finding.tableId ?? finding.resourceId.split('.').pop() ?? finding.resourceId
}

function tableNameFromResourceId(resourceId: string): string {
  return resourceId.split('.').pop() ?? resourceId
}

// Renders "$.requester.email" as a sequence of readable path segments
// rather than one dense monospace blob -- makes the array-marker form
// ("$.contacts[*].email") and a deeply-nested path both easy to scan.
function JsonPathBreadcrumb({ path }: { path: string }) {
  const segments = path
    .replace(/^\$\.?/, '')
    .split('.')
    .filter(Boolean)
  if (segments.length === 0) return <span className="font-mono text-xs text-gray-400">$</span>
  return (
    <span className="inline-flex flex-wrap items-center gap-1 font-mono text-xs">
      <span className="text-gray-400">$</span>
      {segments.map((seg, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span className="text-gray-300">›</span>
          <span className="rounded bg-indigo-50 px-1 py-0.5 text-indigo-700">{seg}</span>
        </span>
      ))}
    </span>
  )
}

function formatTs(ts: string) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function GhostDataPage() {
  const [findings, setFindings] = useState<DiscoveryFinding[]>([])
  const [contentFindings, setContentFindings] = useState<ContentConfirmedFinding[]>([])
  const [loading, setLoading] = useState(true)
  const [declaredCount, setDeclaredCount] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelInitial, setPanelInitial] = useState<DeclareInitial | undefined>(undefined)
  const [panelKey, setPanelKey] = useState(0)

  const loadFindings = useCallback(async () => {
    try {
      const res = await fetch('/api/registry/discovery', { headers: { 'x-tenant-id': TENANT_ID } })
      const data = await res.json()
      return {
        findings: Array.isArray(data.findings) ? (data.findings as DiscoveryFinding[]) : [],
        contentFindings: Array.isArray(data.contentFindings) ? (data.contentFindings as ContentConfirmedFinding[]) : [],
      }
    } catch {
      return { findings: [], contentFindings: [] }
    }
  }, [])

  useEffect(() => {
    let active = true
    loadFindings().then((next) => {
      if (active) {
        setFindings(next.findings)
        setContentFindings(next.contentFindings)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [loadFindings])

  function refresh() {
    loadFindings().then((next) => {
      setFindings(next.findings)
      setContentFindings(next.contentFindings)
    })
  }

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

  function declareFromContentFinding(finding: ContentConfirmedFinding) {
    setPanelInitial({
      tenantId: TENANT_ID,
      resourceId: finding.resourceId,
      system: 'bigquery',
      resourceLayer: 'RAW',
      columns: [finding.columnName],
    })
    setPanelKey((k) => k + 1)
    setPanelOpen(true)
  }

  function handleDeclared() {
    setDeclaredCount((n) => n + 1)
    refresh()
  }

  const totalFindings = findings.length + contentFindings.length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ghost Data</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          PII sitting somewhere in your systems that Chameleon doesn&rsquo;t officially know about, because it
          was never declared to the registry — so nothing guarantees it&rsquo;s covered by deletion.
          {!loading && <> {totalFindings} finding{totalFindings !== 1 ? 's' : ''} open.</>}
        </p>
      </div>

      {totalFindings > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>
            These tables hold PII outside the registry, so nothing guarantees their data is
            crypto-shreddable. Declare each one to bring it under policy, or drop the data
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
      ) : totalFindings === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-8 py-16 text-center shadow-sm">
          <p className="text-2xl mb-2">✓</p>
          <p className="text-sm font-medium text-gray-900">No ghost data detected</p>
          <p className="mt-1 text-sm text-gray-500">
            The latest scans found no undeclared PII.
          </p>
          <Link
            href="/registry"
            className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            View registry →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Content-confirmed tier: strictly stronger evidence -- a real PII
              value was found, at a known path, not just a suggestively-named
              column. Shown first since it needs no benefit of the doubt. */}
          {contentFindings.length > 0 && (
            <section>
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Content-confirmed</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  A real PII value was found at this exact location — not a guess from the column name.
                  From chameleon-pii-dbt&rsquo;s content scanner, which reads actual row values.
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Resource</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Found at</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Classification</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Matches</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Scanned</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contentFindings.map((finding, i) => (
                      <tr key={`${finding.resourceId}-${finding.jsonPath}-${i}`} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-gray-900">{tableNameFromResourceId(finding.resourceId)}</p>
                          <p className="mt-0.5 font-mono text-xs text-gray-400">{finding.resourceId}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-xs text-gray-500">{finding.columnName}</p>
                          <div className="mt-0.5">
                            <JsonPathBreadcrumb path={finding.jsonPath} />
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                            {finding.classification}
                          </span>
                          <span className="ml-1 text-xs text-gray-400">({finding.pattern})</span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {finding.matchCount} / {finding.sampledRows} sampled
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">{formatTs(finding.scannedAt)}</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => declareFromContentFinding(finding)}
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
            </section>
          )}

          {/* Schema-level tier: a column's NAME suggests PII -- unconfirmed,
              from a pure INFORMATION_SCHEMA crawl that never reads a row. */}
          {findings.length > 0 && (
            <section>
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Schema-level</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  A column&rsquo;s name suggests it holds PII — not yet confirmed by reading its values.
                  From the daily warehouse metadata scan.
                </p>
              </div>
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
            </section>
          )}
        </div>
      )}

      {panelOpen && (
        <DeclarePanel
          key={panelKey}
          initial={panelInitial}
          onClose={() => setPanelOpen(false)}
          onDeclared={handleDeclared}
          // Findings here only ever come from the BigQuery warehouse crawler
          // (system: 'pubsub' is never a ghost-data finding), and this route
          // has no server component to resolve the real value from anyway.
          pubsubIngestBaseUrl=""
        />
      )}
    </div>
  )
}
