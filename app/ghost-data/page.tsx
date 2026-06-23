import { ghostDataFixtures } from '@/lib/fixtures'

const actionLabels: Record<string, { label: string; style: string }> = {
  register_column: {
    label: 'Register column',
    style: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  },
  remove_source_data: {
    label: 'Remove source data',
    style: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  },
}

function formatCount(n: number) {
  return n.toLocaleString('en-US')
}

export default function GhostDataPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ghost Data</h1>
        <p className="mt-1 text-sm text-gray-500">
          PII detected in the warehouse that is not declared in the registry.{' '}
          {ghostDataFixtures.length} findings.
        </p>
      </div>

      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="mt-0.5 shrink-0">⚠</span>
        <span>
          These columns contain PII patterns but are not registered. Resolve each finding by
          declaring the column in the registry or removing the underlying source data.
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Resource
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Column
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Pattern
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                Affected rows
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Recommended action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ghostDataFixtures.map((finding) => {
              const action = actionLabels[finding.recommendedAction]
              return (
                <tr key={finding.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {finding.displayName}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-gray-400">
                      {finding.resource}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">
                      {finding.column}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                      {finding.pattern}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-sm tabular-nums text-gray-900">
                    {formatCount(finding.count)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${action.style}`}
                    >
                      {action.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
