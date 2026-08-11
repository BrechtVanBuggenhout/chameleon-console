import { getVersionInfo, getSourceStaleness } from '@/lib/vault-api'
import { Badge } from '@/app/ui/badge'

const SERVICE_LABELS: Record<string, string> = {
  'key-vault': 'Key Vault',
  'pii-ingestor': 'PII Ingestor Worker',
  console: 'Console',
}

function formatTs(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

function stalenessBadge(status?: string) {
  if (status === 'current') return <Badge variant="PASS" />
  if (status === 'stale') return <Badge variant="WARN" />
  return <Badge variant="PENDING" />
}

export default async function StatusPage() {
  const [version, staleness] = await Promise.all([getVersionInfo(), getSourceStaleness()])

  if (!version) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Status</h1>
          <p className="mt-1 text-sm text-gray-500">
            What&apos;s actually deployed, and whether it&apos;s current.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-8 py-16 text-center text-sm text-gray-500 shadow-sm">
          Couldn&apos;t reach Key Vault to check versions.
        </div>
      </div>
    )
  }

  const sources = version.sources ?? {}
  const services = Object.keys(SERVICE_LABELS).filter((k) => sources[k] !== undefined || k === 'key-vault' || k === 'console')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Status</h1>
        <p className="mt-1 text-sm text-gray-500">
          What&apos;s actually deployed, and whether it&apos;s current — the same thing a{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">curl .../version</code> check tells an engineer,
          without needing one.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Deployed services</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-5 py-2.5">Service</th>
              <th className="px-5 py-2.5">Built from</th>
              <th className="px-5 py-2.5">Built at</th>
              <th className="px-5 py-2.5">Current?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((key) => {
              const sha = sources[key]
              const result = staleness?.results?.[key]
              return (
                <tr key={key}>
                  <td className="px-5 py-3 font-medium text-gray-900">{SERVICE_LABELS[key] ?? key}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{sha ? sha.slice(0, 12) : '— (pulled Chameleon’s pre-built image)'}</td>
                  <td className="px-5 py-3 text-gray-700">{formatTs(sources.builtAt ?? null)}</td>
                  <td className="px-5 py-3">
                    {staleness?.status === 'not_applicable' ? (
                      <span className="text-xs text-gray-400">Not applicable</span>
                    ) : result ? (
                      <span className="inline-flex items-center gap-1.5">
                        {stalenessBadge(result.status)}
                        {result.status === 'stale' && (
                          <span className="text-xs text-gray-500">newer commit available</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Unknown</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          {staleness?.status === 'not_applicable'
            ? 'Currency checks only apply to deployments that built their own images (build-own-images.sh) — this instance pulled Chameleon’s pre-built images instead, so there’s nothing to compare against.'
            : 'A "stale" service means a newer fix exists upstream that this deployment hasn’t picked up yet — re-run build-own-images.sh to update.'}
        </div>
      </div>
    </div>
  )
}
