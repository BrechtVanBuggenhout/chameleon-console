import Link from 'next/link'
import { getCertificate, getLineageEvents, findLatestCertificate } from '@/lib/vault-api'
import { Badge } from '@/app/ui/badge'

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const KEY_DESTRUCTION_METHOD_LABEL: Record<string, string> = {
  DEK_ERASURE:
    'Key destroyed via DEK erasure — the encryption key itself was destroyed instantly, not scheduled for deletion.',
}

function ghostDataScanSentence(coverage: string, findings: unknown[]) {
  if (coverage === 'NOT_TRACKED') {
    return findings.length
      ? `${findings.length} residual finding(s) recorded, but scan coverage isn't tracked yet — an empty result elsewhere would not mean "confirmed clean."`
      : 'No residual findings recorded. Scan coverage isn’t tracked yet, so this is not the same as a confirmed clean scan.'
  }
  return findings.length
    ? `${findings.length} residual finding(s) found.`
    : 'No residual findings.'
}

const eventStyles: Record<string, string> = {
  DELETION_REQUESTED: 'bg-gray-100 text-gray-600',
  KEY_SHREDDED: 'bg-red-100 text-red-700',
  WIPE_REQUEST_QUEUED: 'bg-blue-100 text-blue-700',
  SAAS_WIPE_SUCCEEDED: 'bg-green-100 text-green-700',
  CERTIFICATE_ISSUED: 'bg-indigo-100 text-indigo-700',
}

function PageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-gray-900">Proof</h1>
      <p className="mt-1 text-sm text-gray-500">
        Signed certificate of destruction and audit trail for completed deletions.
      </p>
    </div>
  )
}

function SearchForm({ defaultValue }: { defaultValue?: string }) {
  return (
    <form action="/proof" method="get" className="mb-6 flex max-w-sm gap-2">
      <input
        type="text"
        name="userId"
        defaultValue={defaultValue}
        placeholder="Look up a user ID…"
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Look up
      </button>
    </form>
  )
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
    if (!proof) {
      return (
        <div>
          <PageHeader />
          <SearchForm defaultValue={userId} />
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-8 py-20 text-center shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl">
              🔐
            </div>
            <h2 className="text-base font-semibold text-gray-900">No certificate found for &quot;{userId}&quot;</h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              This user has no completed deletion on record yet.
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
  } else {
    const latest = await findLatestCertificate()
    if (!latest) {
      return (
        <div>
          <PageHeader />
          <SearchForm />
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-8 py-20 text-center shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl">
              🔐
            </div>
            <h2 className="text-base font-semibold text-gray-900">No deletion certificates yet</h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              Run a deletion workflow for a user and a signed proof certificate will appear here automatically, or look one up by user ID above.
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
    auditTrail = await getLineageEvents(latest.userId)
  }

  const { deletionRequestId, affectedSystems, certificate } = proof!
  const truncatedJwt =
    certificate.jwt.length > 80
      ? `${certificate.jwt.slice(0, 80)}…`
      : certificate.jwt

  return (
    <div>
      <PageHeader />
      <SearchForm defaultValue={userId} />

      {/* What this certificate proves -- plain-language reading of claims
          that were always signed but previously discarded after decoding.
          See lib/vault-api.ts's parseCertificate. */}
      <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">What this certificate proves</h2>
        </div>
        <ul className="space-y-2 px-5 py-4 text-sm text-gray-700">
          <li>
            Checked {certificate.lineageCoverage.destinationsChecked} downstream system(s),{' '}
            {certificate.lineageCoverage.destinationsSucceeded} confirmed erased. Coverage is scoped to{' '}
            {certificate.lineageCoverage.knownDestinationTypes.join(', ')}
            {' '}— this is not a claim of every system this user&apos;s data may ever have touched.
          </li>
          <li>{KEY_DESTRUCTION_METHOD_LABEL[certificate.keyDestructionMethod] ?? certificate.keyDestructionMethod}</li>
          <li>{ghostDataScanSentence(certificate.ghostDataScanCoverage, certificate.ghostDataSummary)}</li>
          <li>
            Chain position{' '}
            {certificate.chainSequence !== null ? `#${certificate.chainSequence}` : 'unlinked (not added to the hash chain)'}
            {certificate.previousCertificateHash ? ', linked to the previous certificate in this tenant’s log.' : ', the first certificate in this tenant’s log.'}
          </li>
          <li>Tenant: <span className="font-mono text-xs">{certificate.tenantId}</span></li>
        </ul>
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
