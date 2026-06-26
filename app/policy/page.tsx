import { getPolicy } from '@/lib/vault-api'
import { Badge } from '@/app/ui/badge'

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const severityStyles: Record<string, string> = {
  ERROR: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  WARNING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  INFO: 'bg-gray-100 text-gray-600',
}

const statusIcon: Record<string, string> = {
  PASS: '✓',
  WARN: '⚠',
  FAIL: '✕',
}

const statusTextColor: Record<string, string> = {
  PASS: 'text-green-700',
  WARN: 'text-amber-700',
  FAIL: 'text-red-700',
}

export default async function PolicyPage() {
  const policy = await getPolicy()
  const { status, evaluatedAt, evaluations, passingCount, warnCount, failCount } = policy

  const totalCount = evaluations.length
  const summaryLine =
    failCount > 0
      ? `${failCount} resource${failCount > 1 ? 's' : ''} failing policy`
      : warnCount > 0
      ? `${warnCount} resource${warnCount > 1 ? 's' : ''} need${warnCount === 1 ? 's' : ''} attention`
      : 'All resources passing'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Policy</h1>
        <p className="mt-1 text-sm text-gray-500">
          Per-resource policy evaluation. Last evaluated {formatTs(evaluatedAt)}.
        </p>
      </div>

      {/* Status banner */}
      <div className="mb-8 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div>
          <p className="text-sm font-medium text-gray-500">Overall status</p>
          <div className="mt-1 flex items-center gap-3">
            <Badge variant={status} className="px-3 py-1 text-sm font-semibold" />
            <span className="text-sm text-gray-500">
              {passingCount} of {totalCount} resources passing · {summaryLine}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400">Evaluated on each registry change</p>
      </div>

      {/* Per-resource evaluations */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Resource evaluations</h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {evaluations.map((evaluation) => (
            <li key={evaluation.resourceId} className="px-5 py-4">
              <div className="flex items-start gap-4">
                <span
                  className={`mt-0.5 shrink-0 text-sm font-bold ${statusTextColor[evaluation.status] ?? 'text-gray-500'}`}
                >
                  {statusIcon[evaluation.status] ?? '·'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{evaluation.displayName}</p>
                    <Badge variant={evaluation.status as 'PASS' | 'WARN' | 'FAIL'} />
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-gray-400">{evaluation.resourceId}</p>
                  {evaluation.issues.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {evaluation.issues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span
                            className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-xs ${severityStyles[issue.severity] ?? severityStyles.INFO}`}
                          >
                            {issue.severity}
                          </span>
                          <span className="text-sm text-gray-600">{issue.message}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400">No issues.</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
