'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/app/ui/badge'
import type { RegistryStatus, Classification, DeletionStrategy, RegistryResource } from '@/lib/fixtures'
import { DeclarePanel, type DeclareInitial } from './declare-panel'
import { TENANT_ID } from '@/lib/tenant'

const systemLabels: Record<string, string> = {
  bigquery: 'BigQuery',
  salesforce: 'Salesforce',
  hubspot: 'HubSpot',
}

const strategyLabels: Record<DeletionStrategy, string> = {
  key_destroy: 'Key destroy',
  row_delete: 'Row delete',
  saas_wipe: 'SaaS wipe',
}

const classificationStyles: Record<Classification, string> = {
  HIGH: 'text-red-700 font-semibold',
  MEDIUM: 'text-amber-700 font-semibold',
  LOW: 'text-gray-500',
}

export function RegistryTable({ resources }: { resources: RegistryResource[] }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [editInitial, setEditInitial] = useState<DeclareInitial | undefined>(undefined)
  const [panelKey, setPanelKey] = useState(0)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [rowSyncMessage, setRowSyncMessage] = useState<{ id: string; message: string } | null>(null)

  async function syncOne(resourceId: string) {
    setSyncingId(resourceId)
    setRowSyncMessage(null)
    setRowError(null)
    try {
      const res = await fetch('/api/registry/sync-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ resourceId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRowError({ id: resourceId, message: data.error ?? 'Sync failed' })
        return
      }
      setRowSyncMessage({
        id: resourceId,
        message: `Queued ${data.chunks_queued} ${data.chunks_queued === 1 ? 'chunk' : 'chunks'}`,
      })
    } catch {
      setRowError({ id: resourceId, message: 'Network error reaching the Key Vault' })
    } finally {
      setSyncingId(null)
    }
  }

  async function openEdit(resourceId: string) {
    setLoadingId(resourceId)
    setRowError(null)
    try {
      const res = await fetch(`/api/registry/resources/${encodeURIComponent(resourceId)}`, {
        headers: { 'x-tenant-id': TENANT_ID },
      })
      const data = await res.json()
      if (!res.ok || !data.resource) {
        setRowError({ id: resourceId, message: data.error ?? 'Failed to load this declaration' })
        return
      }
      const r = data.resource
      setEditInitial({
        tenantId: TENANT_ID,
        resourceId: r.resourceId,
        system: r.system,
        resourceLayer: r.resourceLayer,
        tenantIdColumn: r.tenantIdColumn,
        userIdColumn: r.userIdColumn,
        updatedAtColumn: r.updatedAtColumn,
        deletionStrategy: r.deletionStrategy,
        sourceRedactionStrategy: r.sourceRedactionStrategy,
        ghostDataScanEnabled: r.ghostDataScan?.enabled,
        piiFields: Array.isArray(r.piiFields)
          ? r.piiFields.map((f: { name: string; classification: string; handling: string }) => ({
              name: f.name,
              classification: f.classification,
              handling: f.handling,
            }))
          : undefined,
      })
      setPanelKey((k) => k + 1)
      setEditOpen(true)
    } catch {
      setRowError({ id: resourceId, message: 'Network error reaching the Key Vault' })
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDelete(resourceId: string) {
    if (!window.confirm(`Remove the declaration for "${resourceId}"? This only removes the registry entry — it does not touch the underlying data.`)) {
      return
    }
    setLoadingId(resourceId)
    setRowError(null)
    try {
      const res = await fetch(`/api/registry/resources/${encodeURIComponent(resourceId)}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': TENANT_ID },
      })
      const data = await res.json()
      if (!res.ok) {
        setRowError({ id: resourceId, message: data.error ?? 'Failed to remove this declaration' })
        return
      }
      router.refresh()
    } catch {
      setRowError({ id: resourceId, message: 'Network error reaching the Key Vault' })
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Resource
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                System
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                PII columns
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Deletion strategy
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Classification
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Owner
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Last synced
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {resources.map((resource) => (
              <tr key={resource.resourceId} className="hover:bg-gray-50/50">
                <td className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-900">{resource.displayName}</p>
                  <p className="mt-0.5 font-mono text-xs text-gray-400">{resource.resourceId}</p>
                  {rowError?.id === resource.resourceId && (
                    <p className="mt-1 text-xs text-red-600">{rowError.message}</p>
                  )}
                  {rowSyncMessage?.id === resource.resourceId && (
                    <p className="mt-1 text-xs text-green-600">{rowSyncMessage.message}</p>
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-gray-700">
                  {systemLabels[resource.system] ?? resource.system}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {resource.piiColumns.map((col) => (
                      <span
                        key={col.name}
                        className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600"
                        title={col.classification}
                      >
                        {col.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-gray-700">
                  {strategyLabels[resource.deletionStrategy]}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-sm ${classificationStyles[resource.classification]}`}>
                    {resource.classification}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                    {resource.ownerConnector}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Badge variant={resource.status as RegistryStatus} />
                </td>
                <td className="px-5 py-3 text-sm text-gray-500" title={resource.lastSyncAttemptAt ?? undefined}>
                  {resource.lastSyncAttemptAt ? new Date(resource.lastSyncAttemptAt).toLocaleString() : 'Never synced'}
                </td>
                <td className="px-5 py-3 text-right">
                  {/* Only manually-declared entries are editable — connector/dbt-managed
                      resources are rejected by Key Vault's own PUT/DELETE guard anyway. */}
                  {resource.ownerConnector === 'manual' && (
                    <div className="flex justify-end gap-3 text-xs font-medium">
                      <button
                        onClick={() => syncOne(resource.resourceId)}
                        disabled={syncingId === resource.resourceId}
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      >
                        {syncingId === resource.resourceId ? 'Syncing…' : 'Sync now'}
                      </button>
                      <button
                        onClick={() => openEdit(resource.resourceId)}
                        disabled={loadingId === resource.resourceId}
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(resource.resourceId)}
                        disabled={loadingId === resource.resourceId}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {loadingId === resource.resourceId ? '…' : 'Delete'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editOpen && (
        <DeclarePanel
          key={panelKey}
          initial={editInitial}
          isEdit
          onClose={() => setEditOpen(false)}
          onDeclared={() => setEditOpen(false)}
        />
      )}
    </>
  )
}
