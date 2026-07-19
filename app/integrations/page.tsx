import Link from 'next/link'
import { getRegistryResources } from '@/lib/vault-api'
import { Badge } from '@/app/ui/badge'

const systemNames: Record<string, string> = {
  bigquery: 'BigQuery',
  snowflake: 'Snowflake',
  hubspot: 'HubSpot',
  salesforce: 'Salesforce',
}

function displayName(system: string) {
  return systemNames[system] ?? system.charAt(0).toUpperCase() + system.slice(1)
}

const systemIcons: Record<string, string> = {
  bigquery: 'BQ',
  snowflake: 'SN',
  hubspot: 'HS',
  salesforce: 'SC',
}

const systemIconColors: Record<string, string> = {
  bigquery: 'bg-blue-600 text-white',
  snowflake: 'bg-sky-500 text-white',
  hubspot: 'bg-orange-600 text-white',
  salesforce: 'bg-sky-700 text-white',
}

export default async function IntegrationsPage() {
  const resources = await getRegistryResources()

  const bySystem = new Map<string, number>()
  for (const r of resources) {
    bySystem.set(r.system, (bySystem.get(r.system) ?? 0) + 1)
  }
  const integrations = Array.from(bySystem.entries())
    .map(([system, resourceCount]) => ({ system, name: displayName(system), resourceCount }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          {integrations.length > 0
            ? `${integrations.length} connected system${integrations.length === 1 ? '' : 's'}, from your declared registry resources.`
            : 'No resources declared yet.'}
        </p>
      </div>

      {integrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-8 py-16 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl">
            🔌
          </div>
          <h2 className="text-base font-semibold text-gray-900">No integrations yet</h2>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            Declare a resource from the Registry page to connect a warehouse or system.
          </p>
          <Link
            href="/registry"
            className="mt-6 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Go to Registry →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {integrations.map((integration) => (
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
                    <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
                    <Badge variant="connected" />
                  </div>
                </div>
              </div>
              <dl className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
                <div className="flex items-center justify-between px-5 py-2">
                  <dt className="text-xs text-gray-500">Declared resources</dt>
                  <dd className="text-xs font-medium text-gray-700">{integration.resourceCount}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
