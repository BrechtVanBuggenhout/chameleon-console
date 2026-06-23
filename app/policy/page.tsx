import { policyFixture } from '@/lib/fixtures'
import { Badge } from '@/app/ui/badge'
import type { PolicyStatus, RuleStatus } from '@/lib/fixtures'

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const ruleStatusIcon: Record<RuleStatus, string> = {
  PASS: '✓',
  WARN: '⚠',
  FAIL: '✕',
}

const ruleStatusTextColor: Record<RuleStatus, string> = {
  PASS: 'text-green-700',
  WARN: 'text-amber-700',
  FAIL: 'text-red-700',
}

export default function PolicyPage() {
  const { status, evaluatedAt, rules } = policyFixture
  const passingCount = rules.filter((r) => r.status === 'PASS').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Policy</h1>
        <p className="mt-1 text-sm text-gray-500">
          Warehouse policy evaluation. Last evaluated {formatTs(evaluatedAt)}.
        </p>
      </div>

      {/* Status banner */}
      <div className="mb-8 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div>
          <p className="text-sm font-medium text-gray-500">Overall status</p>
          <div className="mt-1 flex items-center gap-3">
            <Badge
              variant={status as PolicyStatus}
              className="px-3 py-1 text-sm font-semibold"
            />
            <span className="text-sm text-gray-500">
              {passingCount} of {rules.length} rules passing
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400">Evaluated continuously · updated on each scan</p>
      </div>

      {/* Rules */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Policy rules</h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-start gap-4 px-5 py-4">
              <span
                className={`mt-0.5 shrink-0 text-sm font-bold ${ruleStatusTextColor[rule.status]}`}
              >
                {ruleStatusIcon[rule.status]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                  <Badge variant={rule.status} />
                </div>
                <p className="mt-0.5 text-sm text-gray-500">{rule.message}</p>
                <p className="mt-0.5 font-mono text-xs text-gray-400">{rule.id}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
