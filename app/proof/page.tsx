import { proofFixture } from '@/lib/fixtures'
import { Badge } from '@/app/ui/badge'

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const eventStyles: Record<string, string> = {
  DELETION_REQUESTED: 'bg-gray-100 text-gray-600',
  KEY_SHREDDED: 'bg-red-100 text-red-700',
  WIPE_REQUEST_QUEUED: 'bg-blue-100 text-blue-700',
  SAAS_WIPE_SUCCEEDED: 'bg-green-100 text-green-700',
  CERTIFICATE_ISSUED: 'bg-indigo-100 text-indigo-700',
}

export default function ProofPage() {
  const { userId, deletionRequestId, affectedSystems, certificate, auditTrail } =
    proofFixture

  const truncatedJwt =
    certificate.jwt.length > 80
      ? `${certificate.jwt.slice(0, 80)}…`
      : certificate.jwt

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Proof</h1>
        <p className="mt-1 text-sm text-gray-500">
          Signed certificate of destruction and audit trail for completed deletions.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Certificate */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Certificate of destruction
            </h2>
            <Badge variant="CERTIFIED" />
          </div>
          <dl className="divide-y divide-gray-100">
            <div className="flex items-start justify-between px-5 py-3">
              <dt className="text-xs font-medium text-gray-500 w-28 shrink-0">User ID</dt>
              <dd className="text-sm font-mono text-gray-900">{userId}</dd>
            </div>
            <div className="flex items-start justify-between px-5 py-3">
              <dt className="text-xs font-medium text-gray-500 w-28 shrink-0">Request ID</dt>
              <dd className="font-mono text-xs text-gray-600">{deletionRequestId}</dd>
            </div>
            <div className="flex items-start justify-between px-5 py-3">
              <dt className="text-xs font-medium text-gray-500 w-28 shrink-0">Issued at</dt>
              <dd className="text-sm text-gray-700">{formatTs(certificate.issuedAt)}</dd>
            </div>
            <div className="flex items-start justify-between px-5 py-3">
              <dt className="text-xs font-medium text-gray-500 w-28 shrink-0">Key shred</dt>
              <dd className="text-sm text-gray-700">{formatTs(certificate.shredDate)}</dd>
            </div>
            <div className="flex items-start justify-between px-5 py-3">
              <dt className="text-xs font-medium text-gray-500 w-28 shrink-0">Issuer</dt>
              <dd className="text-sm text-gray-700">{certificate.issuer}</dd>
            </div>
            <div className="flex items-start justify-between px-5 py-3">
              <dt className="text-xs font-medium text-gray-500 w-28 shrink-0">Affected</dt>
              <dd className="flex flex-wrap gap-1">
                {affectedSystems.map((s) => (
                  <span
                    key={s}
                    className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                  >
                    {s}
                  </span>
                ))}
              </dd>
            </div>
            <div className="px-5 py-3">
              <dt className="text-xs font-medium text-gray-500 mb-1.5">Fingerprint</dt>
              <dd className="break-all font-mono text-xs text-gray-600 bg-gray-50 rounded p-2">
                {certificate.keyFingerprint}
              </dd>
            </div>
            <div className="px-5 py-3">
              <dt className="text-xs font-medium text-gray-500 mb-1.5">
                Signed JWT
              </dt>
              <dd className="break-all font-mono text-xs text-gray-600 bg-gray-50 rounded p-2">
                {truncatedJwt}
              </dd>
            </div>
          </dl>
        </div>

        {/* Audit trail */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Audit trail</h2>
          </div>
          <ol className="divide-y divide-gray-100">
            {auditTrail.map((entry, i) => (
              <li key={i} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-xs ${eventStyles[entry.event] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {entry.event}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-700">{entry.details}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatTs(entry.timestamp)} · {entry.actor}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

    </div>
  )
}
