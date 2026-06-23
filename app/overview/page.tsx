import { getOverview } from '@/lib/vault-api'
import { Badge } from '@/app/ui/badge'

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
  const { registryCount, policyStatus, ghostFindingCount, lastDeletionProof, _resources } =
    await getOverview()

  const highClassCount = _resources.filter(
    (r) => r.classification === 'HIGH'
  ).length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Compliance posture across all five outcomes.
        </p>
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
          sub="1 rule in warning state"
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
                {registryCount} resources registered across BigQuery, Salesforce, HubSpot
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
                3 of 4 policy rules passing; ghost data causing warning
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
