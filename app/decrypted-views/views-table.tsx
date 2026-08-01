'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/app/ui/badge'
import { TENANT_ID } from '@/lib/tenant'
import type { DecryptedView } from '@/lib/vault-api'

export function ViewsTable({ views }: { views: DecryptedView[] }) {
  const router = useRouter()
  const [loadingName, setLoadingName] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ name: string; message: string } | null>(null)

  async function handleRevoke(viewName: string) {
    if (!window.confirm(`Revoke "${viewName}"? This drops the underlying BigQuery view — it does not touch the source data.`)) {
      return
    }
    setLoadingName(viewName)
    setRowError(null)
    try {
      const res = await fetch(`/api/decrypted-views/${encodeURIComponent(viewName)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ revokedBy: 'console' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRowError({ name: viewName, message: data.error ?? 'Failed to revoke this view' })
        return
      }
      router.refresh()
    } catch {
      setRowError({ name: viewName, message: 'Network error reaching the Key Vault' })
    } finally {
      setLoadingName(null)
    }
  }

  if (views.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-10 text-center text-sm text-gray-400">
        No decrypted views declared yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">View</th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Source</th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Fields</th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Justification</th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Created by</th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {views.map((view) => (
            <tr key={view.view_name} className="hover:bg-gray-50/50">
              <td className="px-5 py-3">
                <p className="text-sm font-medium text-gray-900">{view.view_name}</p>
                <p className="mt-0.5 font-mono text-xs text-gray-400">
                  {view.bigquery_dataset}.{view.bigquery_view_name}
                </p>
                {rowError?.name === view.view_name && (
                  <p className="mt-1 text-xs text-red-600">{rowError.message}</p>
                )}
              </td>
              <td className="px-5 py-3 font-mono text-xs text-gray-600">{view.source_resource_id}</td>
              <td className="px-5 py-3">
                <div className="flex flex-wrap gap-1">
                  {view.declared_fields.map((f) => (
                    <span key={f} className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                      {f}
                    </span>
                  ))}
                </div>
              </td>
              <td className="max-w-xs px-5 py-3 text-sm text-gray-700">{view.business_justification}</td>
              <td className="px-5 py-3 text-sm text-gray-700">{view.created_by}</td>
              <td className="px-5 py-3">
                <Badge variant={view.status} />
              </td>
              <td className="px-5 py-3 text-right">
                {view.status === 'active' && (
                  <button
                    onClick={() => handleRevoke(view.view_name)}
                    disabled={loadingName === view.view_name}
                    className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {loadingName === view.view_name ? '…' : 'Revoke'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
