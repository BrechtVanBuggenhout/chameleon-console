import Link from 'next/link'
import { getDeletionEvidence } from '@/lib/vault-api'

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

const statusStyles: Record<string, string> = {
  CASCADE_PARTIAL_FAILURE: 'bg-red-100 text-red-700',
}
const defaultStatusStyle = 'bg-amber-100 text-amber-700'

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const from = params.from?.trim() || toDateInputValue(defaultFrom)
  const to = params.to?.trim() || toDateInputValue(now)

  const report = await getDeletionEvidence(from, to)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Deletion Evidence</h1>
        <p className="mt-1 text-sm text-gray-500">
          Every deletion request opened in a period, and whether it reached a certificate — the
          rollup an auditor sampling a data-disposal control wants to see, not a single proof.
          Each certificate on its own already proves one deletion happened correctly; this shows
          a whole period at once.
        </p>
      </div>

      <form method="GET" className="mb-6 flex items-end gap-3">
        <div>
          <label htmlFor="from" className="mb-1 block text-xs font-medium text-gray-500">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-xs font-medium text-gray-500">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Update
        </button>
        {report && (
          <a
            href={`/api/compliance/deletion-evidence?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
            className="ml-auto rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Download CSV
          </a>
        )}
      </form>

      {!report && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-8 py-20 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl">
            ⚠
          </div>
          <h2 className="text-base font-semibold text-gray-900">Couldn&apos;t load deletion evidence</h2>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            The Key Vault backend didn&apos;t return a rollup for this period. Try again, or check
            that this deployment is connected to a live backend.
          </p>
        </div>
      )}

      {report && (
        <>
          <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {report.certificateIssued} of {report.totalRequests} request
                {report.totalRequests === 1 ? '' : 's'} reached a certificate
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {formatTs(report.period.from)} — {formatTs(report.period.to)}
                {report.partialFailures > 0 && (
                  <span className="ml-2 text-red-600">
                    {report.partialFailures} cascade partial failure{report.partialFailures === 1 ? '' : 's'}
                  </span>
                )}
                {report.medianTimeToCertificateHours !== null && (
                  <span className="ml-2">
                    · median {report.medianTimeToCertificateHours.toFixed(1)}h to certificate
                  </span>
                )}
              </p>
            </div>
          </div>

          {report.incomplete.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-8 py-20 text-center shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
                ✓
              </div>
              <h2 className="text-base font-semibold text-gray-900">Every request in this period reached a certificate</h2>
              <p className="mt-2 max-w-sm text-sm text-gray-500">No incomplete deletion requests to show.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  {report.incomplete.length} incomplete request{report.incomplete.length === 1 ? '' : 's'}
                </h2>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-400">
                    <th className="px-5 py-2.5">User</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Opened</th>
                    <th className="px-5 py-2.5">Age</th>
                    <th className="px-5 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.incomplete.map((item) => (
                    <tr key={item.deletionRequestId}>
                      <td className="px-5 py-3 font-mono text-xs text-gray-700">{item.userId}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-xs ${statusStyles[item.status] ?? defaultStatusStyle}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{formatTs(item.createdAt)}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{item.ageHours.toFixed(1)}h</td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/proof?userId=${encodeURIComponent(item.userId)}`}
                          className="text-xs font-medium text-gray-700 underline hover:text-gray-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
