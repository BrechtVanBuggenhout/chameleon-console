'use client'

import { useEffect, useState } from 'react'
import { TENANT_ID } from '@/lib/tenant'

interface RawResource {
  resourceId?: string
  resource_id?: string
  displayName?: string
  display_name?: string
  system?: string
  sourceRedactionStrategy?: string
  source_redaction_strategy?: string
}

interface RedactedSource {
  resourceId: string
  displayName: string
  strategy: 'REDACT_IN_PLACE' | 'SHADOW_COPY'
}

const strategyLabels: Record<RedactedSource['strategy'], string> = {
  REDACT_IN_PLACE: 'redact in place',
  SHADOW_COPY: 'shadow copy',
}

const saasLabels: Record<string, string> = {
  hubspot: 'HubSpot',
  salesforce: 'Salesforce',
}

function displayNameFor(resourceId: string, given?: string): string {
  return given || resourceId.split('.').pop() || resourceId
}

/**
 * Read-only "this deletion will also touch" panel -- fetches the same
 * registry data the Registry page shows, no new backend needed. Every
 * declared resource with sourceRedactionStrategy !== 'NONE' gets its
 * source table touched on deletion (see chameleon-key-vault's
 * SourceRedactionService); every hubspot/salesforce resource is wiped via
 * the existing SaaS cascade regardless of that field, which is
 * BigQuery-specific. Same set for any user in the tenant, so this loads
 * once and isn't scoped to whatever userId is currently typed in.
 */
export function AffectedResourcesPanel() {
  const [redactedSources, setRedactedSources] = useState<RedactedSource[]>([])
  const [saasSystems, setSaasSystems] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/registry/resources', { headers: { 'x-tenant-id': TENANT_ID }, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { resources: [] }))
      .then((data) => {
        if (!active) return
        const resources: RawResource[] = Array.isArray(data) ? data : (data.resources ?? [])

        const sources: RedactedSource[] = []
        const saas = new Set<string>()
        for (const r of resources) {
          const resourceId = String(r.resourceId ?? r.resource_id ?? '')
          const system = String(r.system ?? '')
          if (system === 'hubspot' || system === 'salesforce') {
            saas.add(system)
            continue
          }
          const strategy = r.sourceRedactionStrategy ?? r.source_redaction_strategy
          if (strategy === 'REDACT_IN_PLACE' || strategy === 'SHADOW_COPY') {
            sources.push({
              resourceId,
              displayName: displayNameFor(resourceId, r.displayName ?? r.display_name),
              strategy,
            })
          }
        }
        setRedactedSources(sources)
        setSaasSystems(Array.from(saas).sort())
      })
      .catch(() => {
        // Best-effort visibility, not a hard gate -- a fetch failure here
        // must never block triggering a real deletion.
      })
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  if (!loaded || (redactedSources.length === 0 && saasSystems.length === 0)) {
    return null
  }

  return (
    <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3.5 py-3">
      <p className="text-xs font-medium text-gray-700">This deletion will also touch</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {redactedSources.map((source) => (
          <span
            key={source.resourceId}
            title={source.resourceId}
            className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 font-mono text-xs text-blue-800"
          >
            {source.displayName} <span className="ml-1 text-blue-500">({strategyLabels[source.strategy]})</span>
          </span>
        ))}
        {saasSystems.map((system) => (
          <span
            key={system}
            className="inline-flex items-center rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800"
          >
            {saasLabels[system] ?? system}
          </span>
        ))}
      </div>
    </div>
  )
}
