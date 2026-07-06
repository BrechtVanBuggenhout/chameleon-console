import Link from 'next/link'
import type { CoverageReport } from '@/lib/vault-api'

const R = 54
const CIRC = 2 * Math.PI * R

function bandColor(score: number): string {
  if (score >= 80) return '#16a34a' // green
  if (score >= 50) return '#d97706' // amber
  return '#dc2626' // red
}

function Bucket({
  color,
  label,
  count,
  href,
  hint,
}: {
  color: string
  label: string
  count: number
  href: string
  hint: string
}) {
  return (
    <Link
      href={href}
      title={hint}
      className="group -mx-1.5 flex items-center gap-2 rounded px-1.5 py-1 hover:bg-gray-50"
    >
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
      <span className="text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">{hint} →</span>
      <span className="ml-auto text-sm font-semibold tabular-nums text-gray-900">{count}</span>
    </Link>
  )
}

/**
 * Crypto-shred coverage gauge: a single risk-weighted % of PII that is fully shreddable,
 * with the PROTECTED / PARTIAL / EXPOSED breakdown. Pure SVG — renders server-side.
 */
export function CoverageGauge({ coverage }: { coverage: CoverageReport }) {
  const score = Math.max(0, Math.min(100, Math.round(coverage.score)))
  const color = bandColor(score)
  const offset = CIRC * (1 - score / 100)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-6">
        <svg width="132" height="132" viewBox="0 0 140 140" className="shrink-0">
          <circle cx="70" cy="70" r={R} fill="none" stroke="#e5e7eb" strokeWidth="12" />
          <circle
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
          />
          <text x="70" y="66" textAnchor="middle" className="fill-gray-900" style={{ fontSize: 30, fontWeight: 700 }}>
            {score}%
          </text>
          <text x="70" y="88" textAnchor="middle" className="fill-gray-400" style={{ fontSize: 11 }}>
            shreddable
          </text>
        </svg>

        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-gray-900">Crypto-shred coverage</p>
          <p className="text-xs text-gray-500">
            Risk-weighted share of known PII that one key-destroy makes permanently unreadable.
          </p>
          <div className="mt-3 space-y-1">
            <Bucket color="#16a34a" label="Protected" count={coverage.counts.protected} href="/registry" hint="View registry" />
            <Bucket color="#d97706" label="Partial" count={coverage.counts.partial} href="/policy" hint="Review policy" />
            <Bucket color="#dc2626" label="Exposed" count={coverage.counts.exposed} href="/registry" hint="Declare now" />
          </div>
        </div>
      </div>

      {coverage.items.some((i) => i.state === 'EXPOSED') && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">Top exposure</p>
          <ul className="space-y-0.5">
            {coverage.items
              .filter((i) => i.state === 'EXPOSED')
              .slice(0, 3)
              .map((item) => (
                <li key={item.resourceId}>
                  <Link
                    href="/registry"
                    title="Declare this resource"
                    className="group -mx-1.5 flex items-baseline justify-between gap-3 rounded px-1.5 py-1 hover:bg-gray-50"
                  >
                    <span className="truncate font-mono text-xs text-gray-600 group-hover:text-gray-900">{item.resourceId}</span>
                    <span className="shrink-0 text-xs text-gray-400">{item.reasons[0] ?? 'exposed'}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
