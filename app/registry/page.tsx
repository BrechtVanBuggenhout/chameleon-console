import { registryFixtures } from '@/lib/fixtures'
import { Badge } from '@/app/ui/badge'
import type { RegistryStatus, Classification, DeletionStrategy } from '@/lib/fixtures'

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

export default function RegistryPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Registry</h1>
        <p className="mt-1 text-sm text-gray-500">
          PII resources declared across connected systems. {registryFixtures.length} resources
          registered.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
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
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {registryFixtures.map((resource) => (
              <tr key={resource.resourceId} className="hover:bg-gray-50/50">
                <td className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-900">
                    {resource.displayName}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-gray-400">
                    {resource.resourceId}
                  </p>
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
                  <span
                    className={`text-sm ${classificationStyles[resource.classification]}`}
                  >
                    {resource.classification}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Badge variant={resource.status as RegistryStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
