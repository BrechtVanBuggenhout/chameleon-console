import Link from 'next/link'
import { getCertificate, getLineageEvents, findLatestCertificate } from '@/lib/vault-api'
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

export default async function ProofPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  const { userId: queryUserId } = await searchParams

  let userId = queryUserId
  let proof
  let auditTrail

  if (userId) {
    ;[proof, auditTrail] = await Promise.all([
      getCertificate(userId),
      getLineageEvents(userId),
    ])
  } else {
    const latest = await findLatestCertificate()
    if (!latest) {
      return (
        <div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Proof</h1>
            <p className="mt-1 text-sm text-gray-500">
              Signed certificate of destruction and audit trail for completed deletions.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-8 py-20 text-center shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl">
              🔐
            </div>
            <h2 className="text-base font-semibold text-gray-900">No deletion certificates yet</h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              Run a deletion workflow for a demo user and a signed proof certificate will appear here automatically.
            </p>
            <Link
              href="/deletion"
              className="mt-6 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Go to Deletion →
            </Link>
          </div>
        </div>
      )
    }
    userId = latest.userId
    proof = latest.proof
    auditTrail = proof.auditTrail
  }

  const { deletionRequestId, affectedSystems, certificate } = proof!
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
              <dt className="w-28 shrink-0 text-xs font-medium text-gray-500">User ID</dt>
              <dd className="font-mono text-sm text-gray-900">{userId}</dd>
            </div>
            <div className="flex items-start justify-between px-5 py-3">
              <dt className="w-28 shrink-0 text-xs font-medium text-gray-500">Request ID</dt>
              <dd className="font-mono text-xs text-gray-600">{deletionRequestId}</dd>
            </div>
            <div className="flex items-start justify-between px-5 py-3">
              <dt className="w-28 shrink-0 text-xs font-medium text-gray-500">Issued at</dt>
              <dd className="text-sm text-gray-700">{formatTs(certificate.issuedAt)}</dd>
            </div>
            <div className="flex items-start justify-between px-5 py-3">
              <dt className="w-28 shrink-0 text-xs font-medium text-gray-500">Key shred</dt>
              <dd className="text-sm text-gray-700">{formatTs(certificate.shredDate)}</dd>
            </div>
            <div className="flex items-start justify-between px-5 py-3">
              <dt className="w-28 shrink-0 text-xs font-medium text-gray-500">Issuer</dt>
              <dd className="text-sm text-gray-700">{certificate.issuer}</dd>
            </div>
            <div className="flex items-start justify-between px-5 py-3">
              <dt className="w-28 shrink-0 text-xs font-medium text-gray-500">Affected</dt>
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
              <dt className="mb-1.5 text-xs font-medium text-gray-500">Fingerprint</dt>
              <dd className="break-all rounded bg-gray-50 p-2 font-mono text-xs text-gray-600">
                {certificate.keyFingerprint}
              </dd>
            </div>
            <div className="px-5 py-3">
              <dt className="mb-1.5 text-xs font-medium text-gray-500">Signed JWT</dt>
              <dd className="break-all rounded bg-gray-50 p-2 font-mono text-xs text-gray-600">
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
            {auditTrail!.map((entry, i) => (
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
