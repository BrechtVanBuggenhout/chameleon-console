'use client'

import { useCallback, useEffect, useState } from 'react'

interface Project {
  id: string
  label: string
  environment: 'dev' | 'prod'
  gcpProjectId: string | null
  region: string | null
  createdAt: string
}

const emptyForm = {
  label: '',
  environment: 'prod' as 'dev' | 'prod',
  gcpProjectId: '',
  region: '',
  vaultBaseUrl: '',
  tenantId: '',
  vaultApiToken: '',
  vaultRegistryWriteToken: '',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    const res = await fetch('/api/projects', { cache: 'no-store' })
    const data = await res.json()
    return Array.isArray(data.projects) ? (data.projects as Project[]) : []
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setProjects(await loadProjects())
    } finally {
      setLoading(false)
    }
  }, [loadProjects])

  useEffect(() => {
    let active = true
    loadProjects().then((next) => {
      if (active) {
        setProjects(next)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [loadProjects])

  async function selectProject(projectId: string) {
    setSelecting(projectId)
    try {
      await fetch('/api/projects/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      window.location.href = '/overview'
    } finally {
      setSelecting(null)
    }
  }

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          gcpProjectId: form.gcpProjectId || undefined,
          region: form.region || undefined,
          vaultRegistryWriteToken: form.vaultRegistryWriteToken || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to add project')
        return
      }
      setForm(emptyForm)
      setShowForm(false)
      await refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Projects</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900"
        >
          {showForm ? 'Cancel' : 'Add project'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAddProject}
          className="mb-6 space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Register a Chameleon instance you already ran <code>bootstrap.sh</code> for. Find
            these values in that run&rsquo;s output or your <code>terraform.tfvars</code>.
          </p>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label" value={form.label} onChange={(v) => setForm({ ...form, label: v })} required />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Environment</label>
              <select
                value={form.environment}
                onChange={(e) => setForm({ ...form, environment: e.target.value as 'dev' | 'prod' })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="prod">prod</option>
                <option value="dev">dev</option>
              </select>
            </div>
            <Field label="GCP project ID (optional)" value={form.gcpProjectId} onChange={(v) => setForm({ ...form, gcpProjectId: v })} />
            <Field label="Region (optional)" value={form.region} onChange={(v) => setForm({ ...form, region: v })} />
          </div>
          <Field label="Key Vault URL" value={form.vaultBaseUrl} onChange={(v) => setForm({ ...form, vaultBaseUrl: v })} required placeholder="https://chameleon-key-vault-....run.app" />
          <Field
            label="Tenant ID"
            value={form.tenantId}
            onChange={(v) => setForm({ ...form, tenantId: v })}
            required
            placeholder="default-tenant"
            help="Almost always 'default-tenant' — the tenant_id this specific deployment's Terraform resolved to (chameleon-infra-gcp's tenant_id output, or var.tenant_id in terraform.tfvars if it was ever explicitly overridden, which normally shouldn't happen). Getting this wrong makes the console silently query the wrong tenant's data."
          />
          <Field label="Vault API token" value={form.vaultApiToken} onChange={(v) => setForm({ ...form, vaultApiToken: v })} required type="password" />
          <Field label="Registry write token (optional)" value={form.vaultRegistryWriteToken} onChange={(v) => setForm({ ...form, vaultRegistryWriteToken: v })} type="password" />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-white dark:text-gray-900"
          >
            {submitting ? 'Adding…' : 'Add project'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-gray-500">No projects registered yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {p.environment}
                  {p.gcpProjectId ? ` · ${p.gcpProjectId}` : ''}
                  {p.region ? ` · ${p.region}` : ''}
                </p>
              </div>
              <button
                onClick={() => selectProject(p.id)}
                disabled={selecting === p.id}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {selecting === p.id ? 'Switching…' : 'Switch to this project'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  placeholder,
  help,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  placeholder?: string
  help?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      {help && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{help}</p>}
    </div>
  )
}
