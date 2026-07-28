'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TENANT_ID } from '@/lib/tenant'

const SYSTEMS = ['bigquery', 'gcs', 'firestore', 'log', 'hubspot', 'salesforce', 'external'] as const
const LAYERS = ['RAW', 'STAGING', 'INTERMEDIATE', 'MART', 'SAAS'] as const
const CLASSIFICATIONS = [
  'DIRECT_IDENTIFIER',
  'QUASI_IDENTIFIER',
  'CONTACT',
  'SENSITIVE',
  'BEHAVIORAL',
  'SYSTEM_IDENTIFIER',
] as const
const HANDLINGS = ['ENCRYPT', 'TOKENIZE', 'REDACT', 'HASH_SURROGATE', 'ALLOW_AGGREGATE_ONLY', 'MANUAL_REVIEW'] as const
const STRATEGIES = ['CRYPTO_SHRED', 'DELETE_ROWS', 'REDACT_FIELDS', 'EXTERNAL_WIPE', 'MANUAL_REVIEW'] as const

type Field = { name: string; classification: string; handling: string }

export type DeclareInitial = {
  tenantId?: string
  resourceId?: string
  system?: string
  resourceLayer?: string
  columns?: string[]
  /** Full-fidelity fields, present only when editing an existing declaration
   * (fetched fresh via GET, not derived from the lossy list-view mapping). */
  tenantIdColumn?: string
  userIdColumn?: string
  deletionStrategy?: string
  ghostDataScanEnabled?: boolean
  piiFields?: Field[]
}

/** Infer a sensible default classification/handling from a discovered column name. */
export function inferField(name: string): { name: string; classification: string; handling: string } {
  const n = name.toLowerCase()
  const has = (...parts: string[]) => parts.some((p) => n.includes(p))
  if (has('email')) return { name, classification: 'DIRECT_IDENTIFIER', handling: 'ENCRYPT' }
  if (has('phone', 'mobile')) return { name, classification: 'CONTACT', handling: 'ENCRYPT' }
  if (has('ssn', 'social', 'dob', 'birth', 'passport', 'tax')) return { name, classification: 'SENSITIVE', handling: 'ENCRYPT' }
  if (has('first_name', 'last_name', 'full_name', 'fullname', 'firstname', 'lastname')) return { name, classification: 'DIRECT_IDENTIFIER', handling: 'ENCRYPT' }
  if (has('address', 'street', 'city', 'zip', 'postal')) return { name, classification: 'CONTACT', handling: 'ENCRYPT' }
  if (has('ip_address', 'ip', 'device', 'geo', 'lat', 'lon')) return { name, classification: 'QUASI_IDENTIFIER', handling: 'REDACT' }
  if (has('_id', 'id', 'uuid', 'token')) return { name, classification: 'SYSTEM_IDENTIFIER', handling: 'HASH_SURROGATE' }
  return { name, classification: 'QUASI_IDENTIFIER', handling: 'ENCRYPT' }
}

const EMPTY_FIELD: Field = { name: '', classification: 'DIRECT_IDENTIFIER', handling: 'ENCRYPT' }

const labelCls = 'block text-xs font-medium uppercase tracking-wide text-gray-500'
const inputCls =
  'mt-1 w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none'

export function DeclarePanel({
  initial,
  isEdit,
  onClose,
  onDeclared,
}: {
  initial?: DeclareInitial
  /** True when editing an existing declaration — locks the resource ID and PUTs instead of POSTs. */
  isEdit?: boolean
  onClose: () => void
  onDeclared?: () => void
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [schemaColumns, setSchemaColumns] = useState<{ name: string; dataType: string }[] | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [schemaError, setSchemaError] = useState<string | null>(null)

  // State is seeded once from `initial`; the parent remounts via `key` to re-seed
  // (avoids a set-state-in-effect sync). Pre-fills from a discovery finding, or from
  // the full existing entry when editing.
  const [tenantId, setTenantId] = useState(initial?.tenantId ?? TENANT_ID)
  const [resourceId, setResourceId] = useState(initial?.resourceId ?? '')
  const [system, setSystem] = useState<string>(initial?.system ?? 'bigquery')
  const [resourceLayer, setResourceLayer] = useState<string>(initial?.resourceLayer ?? 'RAW')
  const [tenantIdColumn, setTenantIdColumn] = useState(initial?.tenantIdColumn ?? 'tenant_id')
  const [userIdColumn, setUserIdColumn] = useState(initial?.userIdColumn ?? 'user_id')
  const [deletionStrategy, setDeletionStrategy] = useState<string>(initial?.deletionStrategy ?? 'CRYPTO_SHRED')
  const [ghostScan, setGhostScan] = useState(initial?.ghostDataScanEnabled ?? true)
  const [fields, setFields] = useState<Field[]>(
    initial?.piiFields?.length
      ? initial.piiFields
      : initial?.columns?.length
        ? initial.columns.map(inferField)
        : [{ ...EMPTY_FIELD }]
  )

  function updateField(index: number, patch: Partial<Field>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function addFieldFromSchema(columnName: string) {
    setFields((prev) => {
      if (prev.some((f) => f.name === columnName)) return prev
      const inferred = inferField(columnName)
      // Replace a single still-blank starter row rather than piling up alongside it.
      if (prev.length === 1 && !prev[0].name.trim()) return [inferred]
      return [...prev, inferred]
    })
  }

  async function loadSchema() {
    if (!resourceId.trim()) return
    setSchemaLoading(true)
    setSchemaError(null)
    try {
      const res = await fetch(`/api/registry/schema?resourceId=${encodeURIComponent(resourceId)}`, {
        headers: { 'x-tenant-id': tenantId },
      })
      const data = await res.json()
      if (!res.ok) {
        setSchemaError(data.error ?? 'Failed to load schema')
        setSchemaColumns(null)
        return
      }
      setSchemaColumns(data.columns ?? [])
    } catch {
      setSchemaError('Network error reaching the Key Vault')
      setSchemaColumns(null)
    } finally {
      setSchemaLoading(false)
    }
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    setIssues([])
    setSuccess(null)
    try {
      const url = isEdit ? `/api/registry/resources/${encodeURIComponent(resourceId)}` : '/api/registry/resources'
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({
          resourceId,
          system,
          resourceLayer,
          tenantIdColumn: tenantIdColumn || undefined,
          userIdColumn: userIdColumn || undefined,
          deletionStrategy,
          ghostDataScan: { enabled: ghostScan },
          piiFields: fields.filter((f) => f.name.trim()),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Declaration failed')
        if (Array.isArray(data.issues)) setIssues(data.issues)
        return
      }
      const policyIssues: string[] = (data.policy?.issues ?? []).map(
        (i: { severity: string; message: string }) => `${i.severity}: ${i.message}`
      )
      setIssues(policyIssues)
      setSuccess(`${isEdit ? 'Updated' : 'Declared'} ${data.resource.resourceId} (${data.policy?.status ?? 'PASS'})`)
      router.refresh()
      onDeclared?.()
    } catch {
      setError('Network error reaching the Key Vault')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit PII dataset' : 'Declare PII dataset'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
            <p className="mb-5 text-sm text-gray-500">
              {isEdit
                ? 'Update this declaration — every field is resubmitted, so review the full list of PII columns before saving.'
                : 'Register a table an ETL tool (e.g. Fivetran) created so Chameleon tracks and can crypto-shred its PII.'}
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tenant ID</label>
                  <input className={inputCls} value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>System</label>
                  <select className={inputCls} value={system} onChange={(e) => setSystem(e.target.value)}>
                    {SYSTEMS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Resource ID</label>
                <div className="mt-1 flex gap-2">
                  <input
                    className={`${inputCls} mt-0 flex-1 font-mono ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
                    placeholder="bigquery:project.dataset.table"
                    value={resourceId}
                    onChange={(e) => {
                      setResourceId(e.target.value)
                      setSchemaColumns(null)
                      setSchemaError(null)
                    }}
                    disabled={isEdit}
                    title={isEdit ? "A resource's identity can't be changed — delete and re-declare instead." : undefined}
                  />
                  {system === 'bigquery' && (
                    <button
                      onClick={loadSchema}
                      disabled={schemaLoading || !resourceId.trim()}
                      className="shrink-0 rounded border border-gray-300 px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      title="Fetch this table's real columns from BigQuery"
                    >
                      {schemaLoading ? 'Loading…' : 'Load columns'}
                    </button>
                  )}
                </div>
                {schemaError && <p className="mt-1 text-xs text-red-600">{schemaError}</p>}
                {schemaColumns && (
                  <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-2">
                    <p className="mb-1.5 text-xs text-gray-500">
                      {schemaColumns.length === 0
                        ? 'No columns found — check the resource ID.'
                        : 'Click a column to add it below:'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {schemaColumns.map((col) => {
                        const added = fields.some((f) => f.name === col.name)
                        return (
                          <button
                            key={col.name}
                            onClick={() => addFieldFromSchema(col.name)}
                            disabled={added}
                            title={col.dataType}
                            className={`rounded-full border px-2 py-0.5 font-mono text-xs ${
                              added
                                ? 'border-green-300 bg-green-50 text-green-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {added ? '✓ ' : '+ '}
                            {col.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Resource layer</label>
                  <select className={inputCls} value={resourceLayer} onChange={(e) => setResourceLayer(e.target.value)}>
                    {LAYERS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Deletion strategy</label>
                  <select className={inputCls} value={deletionStrategy} onChange={(e) => setDeletionStrategy(e.target.value)}>
                    {STRATEGIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tenant ID column</label>
                  <input className={inputCls} value={tenantIdColumn} onChange={(e) => setTenantIdColumn(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>User ID column</label>
                  <input className={inputCls} value={userIdColumn} onChange={(e) => setUserIdColumn(e.target.value)} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={ghostScan} onChange={(e) => setGhostScan(e.target.checked)} />
                Enable ghost-data scanning
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className={labelCls}>PII columns</label>
                  <button
                    onClick={() => setFields((prev) => [...prev, { name: '', classification: 'CONTACT', handling: 'ENCRYPT' }])}
                    className="text-xs font-medium text-gray-900 hover:underline"
                  >
                    + Add column
                  </button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                      <input
                        className={`${inputCls} mt-0 font-mono`}
                        placeholder="column"
                        value={field.name}
                        onChange={(e) => updateField(i, { name: e.target.value })}
                      />
                      <select
                        className={`${inputCls} mt-0`}
                        value={field.classification}
                        onChange={(e) => updateField(i, { classification: e.target.value })}
                      >
                        {CLASSIFICATIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <select
                        className={`${inputCls} mt-0`}
                        value={field.handling}
                        onChange={(e) => updateField(i, { handling: e.target.value })}
                      >
                        {HANDLINGS.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setFields((prev) => prev.filter((_, idx) => idx !== i))}
                        className="px-1 text-gray-400 hover:text-red-600"
                        aria-label="Remove column"
                        disabled={fields.length === 1}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              {issues.length > 0 && (
                <ul className="list-inside list-disc rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
              {success && <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Close
                </button>
                <button
                  onClick={submit}
                  disabled={submitting || !resourceId.trim()}
                  className="rounded-md bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  {submitting ? (isEdit ? 'Saving…' : 'Declaring…') : isEdit ? 'Save changes' : 'Declare'}
                </button>
              </div>
            </div>
          </div>
        </div>
  )
}
