import { getAuditEventsForActor, type AuditEvent } from '@/lib/vault-api'

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const eventStyles: Record<AuditEvent['type'], string> = {
  PII_REGISTRY_DECLARED: 'bg-green-100 text-green-700',
  PII_REGISTRY_MODIFIED: 'bg-blue-100 text-blue-700',
  DELETION_REQUESTED: 'bg-red-100 text-red-700',
}

const eventLabels: Record<AuditEvent['type'], string> = {
  PII_REGISTRY_DECLARED: 'Declared resource',
  PII_REGISTRY_MODIFIED: 'Modified resource',
  DELETION_REQUESTED: 'Requested deletion',
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  const trimmedEmail = email?.trim()
  const events = trimmedEmail ? await getAuditEventsForActor(trimmedEmail) : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Audit</h1>
        <p className="mt-1 text-sm text-gray-500">
          What a specific person declared, modified, or requested — attributed to a real, resolved
          credential, not a self-reported header. Only actions taken with a per-analyst or
          console-session credential are attributable; writes made with the shared write token
          have no individual to attribute and won&apos;t appear here.
        </p>
      </div>

      <form method="GET" className="mb-6 flex items-end gap-3">
        <div className="flex-1 max-w-sm">
          <label htmlFor="email" className="mb-1 block text-xs font-medium text-gray-500">
            Actor email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={trimmedEmail}
            placeholder="analyst@example.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Search
        </button>
      </form>

      {!trimmedEmail && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-8 py-20 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl">
            ⌕
          </div>
          <h2 className="text-base font-semibold text-gray-900">Search for a person&apos;s activity</h2>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            Enter the email of an analyst or console user to see every registry declaration,
            modification, and deletion request they&apos;re attributed to.
          </p>
        </div>
      )}

      {trimmedEmail && events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-8 py-20 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl">
            ⌕
          </div>
          <h2 className="text-base font-semibold text-gray-900">
            No attributed activity found for &quot;{trimmedEmail}&quot;
          </h2>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            Either this person hasn&apos;t taken any registry or deletion actions yet, or their writes
            were made with the shared credential rather than a per-person one.
          </p>
        </div>
      )}

      {trimmedEmail && events.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {events.length} event{events.length === 1 ? '' : 's'} for {trimmedEmail}
            </h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-400">
                <th className="px-5 py-2.5">Action</th>
                <th className="px-5 py-2.5">Resource</th>
                <th className="px-5 py-2.5">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event, i) => (
                <tr key={`${event.type}-${event.resourceId}-${i}`}>
                  <td className="px-5 py-3">
                    <span className={`rounded px-1.5 py-0.5 font-mono text-xs ${eventStyles[event.type]}`}>
                      {eventLabels[event.type]}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">{event.resourceId}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{formatTs(event.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
