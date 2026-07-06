import { getOverview, getPolicy, getCoverage } from '@/lib/vault-api'
import { Badge } from '@/app/ui/badge'
import { CoverageGauge } from '@/app/ui/coverage-gauge'

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default async function OverviewPage() {
  const [overview, policy, coverage] = await Promise.all([getOverview(), getPolicy(), getCoverage()])
  const { registryCount, policyStatus, ghostFindingCount, lastDeletionProof, _resources } = overview

  const highClassCount = _resources.filter((r) => r.classification === 'HIGH').length
  const systems = [...new Set(_resources.map((r) => r.system))].join(', ')
  const warnResources = policy.evaluations.filter(e => e.status === 'WARN' || e.status === 'FAIL')
  const policyDetail =
    policy.failCount > 0
      ? `${policy.failCount} resource${policy.failCount > 1 ? 's' : ''} failing`
      : policy.warnCount > 0
      ? `${policy.warnCount} resource${policy.warnCount > 1 ? 's' : ''} need${policy.warnCount === 1 ? 's' : ''} attention`
      : 'All resources passing'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Compliance posture across all five outcomes.
        </p>
      </div>

      {/* Crypto-shred coverage — the headline risk metric */}
      <div className="mb-8">
        <CoverageGauge coverage={coverage} />
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Registry resources"
          value={registryCount}
          sub={`${highClassCount} HIGH classification`}
        />
        <StatCard
          label="Policy status"
          value={policyStatus}
          sub={policyDetail}
        />
        <StatCard
          label="Ghost findings"
          value={ghostFindingCount}
          sub="Undeclared PII detected"
        />
        <StatCard
          label="Last deletion proof"
          value={lastDeletionProof.status}
          sub={formatTs(lastDeletionProof.timestamp)}
        />
      </div>

      {/* Outcome summary */}
      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Compliance outcomes</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Outcome
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Detail
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-5 py-3 text-sm font-medium text-gray-900">
                1 · Discover PII
              </td>
              <td className="px-5 py-3">
                <Badge variant="PASS" />
              </td>
              <td className="px-5 py-3 text-sm text-gray-500">
                {registryCount} resources registered across {systems || 'bigquery'}
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-sm font-medium text-gray-900">
                2 · Detect ghost data
              </td>
              <td className="px-5 py-3">
                <Badge variant="WARN" />
              </td>
              <td className="px-5 py-3 text-sm text-gray-500">
                {ghostFindingCount} ghost findings — undeclared PII columns detected in warehouse
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-sm font-medium text-gray-900">
                3 · Enforce policy
              </td>
              <td className="px-5 py-3">
                <Badge variant={policyStatus} />
              </td>
              <td className="px-5 py-3 text-sm text-gray-500">
                {policy.passingCount} of {policy.evaluations.length} resources passing{warnResources.length > 0 ? ` · ${warnResources.map(e => e.displayName).join(', ')}` : ''}
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-sm font-medium text-gray-900">
                4 · Execute deletion
              </td>
              <td className="px-5 py-3">
                <Badge variant="PASS" />
              </td>
              <td className="px-5 py-3 text-sm text-gray-500">
                Last deletion completed for {lastDeletionProof.userId} in under 15 seconds
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-sm font-medium text-gray-900">
                5 · Prove deletion
              </td>
              <td className="px-5 py-3">
                <Badge variant="CERTIFIED" />
              </td>
              <td className="px-5 py-3 text-sm text-gray-500">
                Signed certificate issued at {formatTs(lastDeletionProof.timestamp)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
