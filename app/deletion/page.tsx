import { deletionFixture } from '@/lib/fixtures'
import { Badge } from '@/app/ui/badge'

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatDuration(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

const systemColors: Record<string, string> = {
  'Key Vault': 'bg-indigo-100 text-indigo-700',
  BigQuery: 'bg-blue-100 text-blue-700',
  Salesforce: 'bg-sky-100 text-sky-700',
  HubSpot: 'bg-orange-100 text-orange-700',
}

export default function DeletionPage() {
  const { userId, requestId, requestedAt, completedAt, steps } = deletionFixture

  const totalMs = steps.reduce((sum, s) => sum + s.durationMs, 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Deletion</h1>
        <p className="mt-1 text-sm text-gray-500">
          Trigger a user deletion and track the execution across all connected systems.
        </p>
      </div>

      {/* Trigger form — live in Stage 2 */}
      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Trigger deletion</h2>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-sm">
              <label
                htmlFor="userId"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                User identifier
              </label>
              <input
                id="userId"
                type="text"
                disabled
                placeholder="e.g. user_8821"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-400 shadow-sm placeholder:text-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50"
              />
            </div>
            <button
              disabled
              className="flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              Trigger deletion
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                Stage 2
              </span>
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Live deletion requires Key Vault integration (Stage 2).
          </p>
        </div>
      </div>

      {/* Sample execution */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Sample execution — {userId}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-gray-400">{requestId}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="COMPLETED" />
            <span className="text-xs text-gray-400">
              {formatDuration(totalMs)} total
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {steps.map((step) => (
            <div key={step.step} className="flex items-center gap-4 px-5 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                {step.step}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{step.action}</p>
                <p className="text-xs text-gray-400">{formatTs(step.timestamp)}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${systemColors[step.system] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {step.system}
              </span>
              <span className="w-14 text-right text-xs tabular-nums text-gray-400">
                {formatDuration(step.durationMs)}
              </span>
              <Badge variant="COMPLETED" />
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 text-xs text-gray-500">
          Requested {formatTs(requestedAt)} · Completed {formatTs(completedAt)}
        </div>
      </div>
    </div>
  )
}
