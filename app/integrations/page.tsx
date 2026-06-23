import { integrationsFixture } from '@/lib/fixtures'
import { Badge } from '@/app/ui/badge'
import type { IntegrationStatus } from '@/lib/fixtures'

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const systemIcons: Record<string, string> = {
  'key-vault': 'KV',
  bigquery: 'BQ',
  dbt: 'dbt',
  salesforce: 'SF',
  hubspot: 'HS',
}

const systemIconColors: Record<string, string> = {
  'key-vault': 'bg-indigo-600 text-white',
  bigquery: 'bg-blue-600 text-white',
  dbt: 'bg-orange-500 text-white',
  salesforce: 'bg-sky-500 text-white',
  hubspot: 'bg-orange-600 text-white',
}

export default function IntegrationsPage() {
  const connectedCount = integrationsFixture.filter(
    (i) => i.status === 'connected'
  ).length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Connected systems. {connectedCount} of {integrationsFixture.length} connected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {integrationsFixture.map((integration) => (
          <div
            key={integration.system}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <div className="flex items-center gap-4 px-5 py-5">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${systemIconColors[integration.system] ?? 'bg-gray-200 text-gray-700'}`}
              >
                {systemIcons[integration.system] ?? integration.system.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {integration.name}
                  </p>
                  <Badge variant={integration.status as IntegrationStatus} />
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{integration.details}</p>
              </div>
            </div>
            <dl className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
              <div className="flex items-center justify-between px-5 py-2">
                <dt className="text-xs text-gray-500">Resources</dt>
                <dd className="text-xs font-medium text-gray-700">
                  {integration.resourceCount}
                </dd>
              </div>
              <div className="flex items-center justify-between px-5 py-2">
                <dt className="text-xs text-gray-500">Last sync</dt>
                <dd className="text-xs font-medium text-gray-700">
                  {formatTs(integration.lastSync)}
                </dd>
              </div>
            </dl>
            {integration.status === 'warning' && (
              <div className="border-t border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-700">
                ⚠ {integration.details}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
