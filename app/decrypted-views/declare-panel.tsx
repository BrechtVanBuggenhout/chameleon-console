'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TENANT_ID } from '@/lib/tenant'

// Only fields with a real crypto anchor can ever be exposed through a
// decrypted view -- matches the SHREDDABLE_HANDLING set enforced server-side
// in decrypted-view-service.ts. Shown here so a customer sees why a field is
// greyed out instead of just hitting a 400 on submit.
const SHREDDABLE_HANDLING = new Set(['ENCRYPT', 'TOKENIZE', 'HASH_SURROGATE'])

type RegistryField = { name: string; classification: string; handling: string }

const labelCls = 'block text-xs font-medium uppercase tracking-wide text-gray-500'
const inputCls =
  'mt-1 w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none'
const helpCls = 'mt-1 text-xs text-gray-400'

export function DeclarePanel({ onClose, onDeclared }: { onClose: () => void; onDeclared?: () => void }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [viewName, setViewName] = useState('')
  const [sourceResourceId, setSourceResourceId] = useState('')
  const [businessJustification, setBusinessJustification] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [consumerServiceAccount, setConsumerServiceAccount] = useState('')
  const [declaredFields, setDeclaredFields] = useState<string[]>([])

  const [registryFields, setRegistryFields] = useState<RegistryField[] | null>(null)
  const [registryLoading, setRegistryLoading] = useState(false)
  const [registryError, setRegistryError] = useState<string | null>(null)

  function toggleField(name: string) {
    setDeclaredFields((prev) => (prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]))
  }

  async function loadRegistryFields() {
    if (!sourceResourceId.trim()) return
    setRegistryLoading(true)
    setRegistryError(null)
    setRegistryFields(null)
    try {
      const res = await fetch(`/api/registry/resources/${encodeURIComponent(sourceResourceId)}`, {
        headers: { 'x-tenant-id': TENANT_ID },
      })
      const data = await res.json()
      if (!res.ok || !data.resource) {
        setRegistryError(data.error ?? 'No declared PII resource found for this ID')
        return
      }
      const fields = Array.isArray(data.resource.piiFields)
        ? (data.resource.piiFields as RegistryField[])
        : []
      setRegistryFields(fields)
    } catch {
      setRegistryError('Network error reaching the Key Vault')
    } finally {
      setRegistryLoading(false)
    }
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/decrypted-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({
          viewName,
          sourceResourceId,
          declaredFields,
          businessJustification,
          createdBy,
          consumerServiceAccount,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Declaration failed')
        return
      }
      setSuccess(`Declared ${data.bigquery_dataset}.${data.bigquery_view_name}`)
      router.refresh()
      onDeclared?.()
    } catch {
      setError('Network error reaching the Key Vault')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    viewName.trim() &&
    sourceResourceId.trim() &&
    declaredFields.length > 0 &&
    businessJustification.trim() &&
    createdBy.trim() &&
    consumerServiceAccount.trim()

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Declare decrypted view</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <p className="mb-5 text-sm text-gray-500">
          Creates a BigQuery Authorized View that decrypts the fields below live, on every query — nothing is
          ever written to storage. A user shredded after this view is declared simply stops decrypting on the
          next query; no extra cleanup needed here.
        </p>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>View name</label>
            <input
              className={`${inputCls} font-mono`}
              placeholder="campaign_send_email"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
            />
            <p className={helpCls}>Used to build the BigQuery view&apos;s name — letters, numbers, underscores only.</p>
          </div>

          <div>
            <label className={labelCls}>Source resource ID</label>
            <div className="mt-1 flex gap-2">
              <input
                className={`${inputCls} mt-0 flex-1 font-mono`}
                placeholder="bigquery:project.dataset.table"
                value={sourceResourceId}
                onChange={(e) => {
                  setSourceResourceId(e.target.value)
                  setRegistryFields(null)
                  setRegistryError(null)
                  setDeclaredFields([])
                }}
              />
              <button
                onClick={loadRegistryFields}
                disabled={registryLoading || !sourceResourceId.trim()}
                className="shrink-0 rounded border border-gray-300 px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                title="Fetch this resource's declared PII fields from the registry"
              >
                {registryLoading ? 'Loading…' : 'Load fields'}
              </button>
            </div>
            <p className={helpCls}>Must already be declared in the Registry — the same resource ID shown there.</p>
            {registryError && <p className="mt-1 text-xs text-red-600">{registryError}</p>}
          </div>

          {registryFields && (
            <div>
              <label className={labelCls}>Declared fields</label>
              <p className={`${helpCls} mb-2`}>
                Only fields with a real crypto anchor (ENCRYPT, TOKENIZE, HASH_SURROGATE) can be exposed —
                others are shown but disabled.
              </p>
              {registryFields.length === 0 ? (
                <p className="text-xs text-gray-400">No PII fields declared on this resource.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {registryFields.map((f) => {
                    const eligible = SHREDDABLE_HANDLING.has(f.handling)
                    const selected = declaredFields.includes(f.name)
                    return (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => eligible && toggleField(f.name)}
                        disabled={!eligible}
                        title={eligible ? f.handling : `${f.handling} has no crypto anchor to decrypt`}
                        className={`rounded-full border px-2 py-0.5 font-mono text-xs ${
                          !eligible
                            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
                            : selected
                              ? 'border-green-300 bg-green-50 text-green-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}
                        {f.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className={labelCls}>Business justification</label>
            <textarea
              className={`${inputCls} min-h-20`}
              placeholder="e.g. Joining decrypted emails against the campaign mart to send receipts."
              value={businessJustification}
              onChange={(e) => setBusinessJustification(e.target.value)}
            />
            <p className={helpCls}>Required — recorded on the declaration as part of its audit trail.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Created by</label>
              <input
                className={inputCls}
                placeholder="you@company.com"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
              />
              <p className={helpCls}>Who&apos;s declaring this view.</p>
            </div>
            <div>
              <label className={labelCls}>Consumer service account</label>
              <input
                className={`${inputCls} font-mono`}
                placeholder="job-sa@project.iam.gserviceaccount.com"
                value={consumerServiceAccount}
                onChange={(e) => setConsumerServiceAccount(e.target.value)}
              />
              <p className={helpCls}>Gets dataViewer-only on this view — never write access.</p>
            </div>
          </div>

          {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Close
            </button>
            <button
              onClick={submit}
              disabled={submitting || !canSubmit}
              className="rounded-md bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {submitting ? 'Declaring…' : 'Declare'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
