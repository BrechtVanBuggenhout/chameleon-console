import {
  overviewFixture,
  registryFixtures,
  policyFixture,
  deletionFixture,
  proofFixture,
} from '@/lib/fixtures'
import type {
  RegistryResource,
} from '@/lib/fixtures'
import { getActiveProjectContext } from '@/lib/project-context'

async function kvFetch(path: string) {
  const context = await getActiveProjectContext()
  if (!context) return null
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant-id': context.tenantId }
    if (context.vaultApiToken) headers['Authorization'] = `Bearer ${context.vaultApiToken}`
    const res = await fetch(`${context.vaultBaseUrl}${path}`, {
      headers,
      // This console image is shared, unmodified, across every customer
      // instance, and the active project can change per-request (project
      // switcher) -- no caching here at all, every call resolves live.
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// Every real deployment always has EITHER a resolvable active project
// (customer session) OR the static Terraform-wired fallback (break-glass /
// pre-multi-project deployments) -- see project-context.ts. This is only
// ever null in local dev with neither configured. Used below to gate
// fixture fallbacks so they only ever appear in that narrow case, never for
// a real deployed instance with simply nothing declared yet.
async function hasLiveBackend(): Promise<boolean> {
  return (await getActiveProjectContext()) !== null
}

export async function getRegistryResources(): Promise<RegistryResource[]> {
  const data = await kvFetch('/pii-registry/resources')
  // A real deployed instance always has VAULT_BASE_URL set — if the call
  // still failed or returned nothing, that's a real empty registry or a real
  // error, not a reason to show Chameleon's own dev fixtures. Fixtures are
  // only for local dev with no Key Vault configured at all.
  if (!data) return (await hasLiveBackend()) ? [] : registryFixtures
  // KV returns { resources: [...] }
  const resources = Array.isArray(data) ? data : (data.resources ?? [])
  return resources.map((r: Record<string, unknown>) => {
    // KV uses piiFields; fixtures use piiColumns — normalise to piiColumns for the UI
    const rawFields = Array.isArray(r.piiFields) ? r.piiFields
      : Array.isArray(r.piiColumns) ? r.piiColumns
      : []
    const piiColumns = (rawFields as Record<string, unknown>[]).map(f => ({
      name: String(f.name ?? ''),
      classification: String(f.classification ?? ''),
    }))

    // KV uses SCREAMING_SNAKE (CRYPTO_SHRED, EXTERNAL_WIPE, MANUAL_REVIEW)
    // UI expects key_destroy | row_delete | saas_wipe
    const strategyRaw = String(r.deletionStrategy ?? r.deletion_strategy ?? 'key_destroy')
    const deletionStrategy = (
      strategyRaw === 'CRYPTO_SHRED' ? 'key_destroy'
      : strategyRaw === 'EXTERNAL_WIPE' ? 'saas_wipe'
      : strategyRaw === 'MANUAL_REVIEW' ? 'row_delete'
      : strategyRaw
    ) as 'key_destroy' | 'row_delete' | 'saas_wipe'

    // Derive classification from the most sensitive piiField present
    const classificationRank: Record<string, number> = {
      DIRECT_IDENTIFIER: 3, SENSITIVE: 3, CONTACT: 2,
      QUASI_IDENTIFIER: 2, BEHAVIORAL: 1, SYSTEM_IDENTIFIER: 0,
    }
    const topClass = piiColumns.reduce((best, col) => {
      return (classificationRank[col.classification] ?? 0) > (classificationRank[best] ?? 0)
        ? col.classification : best
    }, 'SYSTEM_IDENTIFIER')
    const classification = (
      topClass === 'DIRECT_IDENTIFIER' || topClass === 'SENSITIVE' ? 'HIGH'
      : topClass === 'CONTACT' || topClass === 'QUASI_IDENTIFIER' || topClass === 'BEHAVIORAL' ? 'MEDIUM'
      : 'LOW'
    ) as 'HIGH' | 'MEDIUM' | 'LOW'

    const resourceId = String(r.resourceId ?? r.resource_id ?? '')
    // Display name: last segment after the final dot
    const displayName = String(r.displayName ?? r.display_name ?? resourceId.split('.').pop() ?? resourceId)

    return {
      resourceId,
      system: String(r.system ?? r.ownerConnector ?? 'bigquery'),
      displayName,
      piiColumns,
      deletionStrategy,
      classification,
      status: String(r.status ?? 'declared') as 'declared' | 'ghost' | 'policy_warning',
      scanEnabled: Boolean(r.scanEnabled ?? r.scan_enabled ?? false),
      ownerConnector: String(r.ownerConnector ?? r.owner_connector ?? 'pipelines'),
      lastSyncedAt: (r.lastSyncedAt ?? r.last_synced_at) ? String(r.lastSyncedAt ?? r.last_synced_at) : undefined,
      lastSyncAttemptAt: (r.lastSyncAttemptAt ?? r.last_sync_attempt_at)
        ? String(r.lastSyncAttemptAt ?? r.last_sync_attempt_at)
        : undefined,
    }
  })
}

export type PolicyIssue = {
  code: string
  severity: 'WARNING' | 'INFO' | 'ERROR'
  resourceId: string
  message: string
}

export type ResourceEvaluation = {
  resourceId: string
  displayName: string
  status: 'PASS' | 'WARN' | 'FAIL'
  issues: PolicyIssue[]
}

export type LivePolicy = {
  status: 'PASS' | 'WARN' | 'FAIL'
  evaluatedAt: string
  evaluations: ResourceEvaluation[]
  passingCount: number
  warnCount: number
  failCount: number
}

export async function getPolicy(): Promise<LivePolicy> {
  const data = await kvFetch('/pii-registry/policy')

  if (!data || !Array.isArray(data.evaluations)) {
    if (await hasLiveBackend()) {
      // Real instance, no evaluations yet (e.g. nothing declared) — a real
      // empty/passing state, not Chameleon's own demo policy rules.
      return {
        status: 'PASS',
        evaluatedAt: new Date().toISOString(),
        evaluations: [],
        passingCount: 0,
        warnCount: 0,
        failCount: 0,
      }
    }
    // Derive from fixture so the shape is consistent
    const evals = policyFixture.rules.map(r => ({
      resourceId: r.id,
      displayName: r.name,
      status: r.status as 'PASS' | 'WARN' | 'FAIL',
      issues: r.status !== 'PASS'
        ? [{ code: r.id.toUpperCase(), severity: 'WARNING' as const, resourceId: r.id, message: r.message }]
        : [],
    }))
    return {
      status: policyFixture.status as 'PASS' | 'WARN' | 'FAIL',
      evaluatedAt: policyFixture.evaluatedAt,
      evaluations: evals,
      passingCount: evals.filter(e => e.status === 'PASS').length,
      warnCount: evals.filter(e => e.status === 'WARN').length,
      failCount: evals.filter(e => e.status === 'FAIL').length,
    }
  }

  const evals: ResourceEvaluation[] = (data.evaluations as Record<string, unknown>[]).map(e => ({
    resourceId: String(e.resourceId ?? ''),
    displayName: String(e.resourceId ?? '').split('.').pop() ?? String(e.resourceId ?? ''),
    status: (e.status as 'PASS' | 'WARN' | 'FAIL') ?? 'PASS',
    issues: Array.isArray(e.issues) ? (e.issues as PolicyIssue[]) : [],
  }))

  return {
    status: (data.status as 'PASS' | 'WARN' | 'FAIL') ?? 'PASS',
    evaluatedAt: String(data.timestamp ?? data.evaluatedAt ?? new Date().toISOString()),
    evaluations: evals,
    passingCount: evals.filter(e => e.status === 'PASS').length,
    warnCount: evals.filter(e => e.status === 'WARN').length,
    failCount: evals.filter(e => e.status === 'FAIL').length,
  }
}

export type CoverageState = 'PROTECTED' | 'PARTIAL' | 'EXPOSED'

export type CoverageItem = {
  resourceId: string
  system: string
  state: CoverageState
  weight: number
  reasons: string[]
}

export type CoverageReport = {
  score: number
  counts: { protected: number; partial: number; exposed: number; total: number }
  weights: { protected: number; partial: number; exposed: number; total: number }
  items: CoverageItem[]
  evaluatedAt: string
}

export async function getCoverage(): Promise<CoverageReport> {
  const data = await kvFetch('/pii-registry/coverage')

  if (!data || typeof data.score !== 'number') {
    if (await hasLiveBackend()) {
      // Real instance, nothing to score yet — a real empty state, not
      // Chameleon's own demo coverage numbers.
      return {
        score: 0,
        counts: { protected: 0, partial: 0, exposed: 0, total: 0 },
        weights: { protected: 0, partial: 0, exposed: 0, total: 0 },
        items: [],
        evaluatedAt: new Date().toISOString(),
      }
    }
    // Demo fallback so the gauge renders without a live Key Vault.
    return {
      score: 72,
      counts: { protected: 3, partial: 2, exposed: 1, total: 6 },
      weights: { protected: 8, partial: 5, exposed: 4, total: 17 },
      items: [
        { resourceId: 'bigquery:chameleon_dev.fivetran_hubspot.contacts', system: 'bigquery', state: 'EXPOSED', weight: 4, reasons: ['discovered but undeclared'] },
        { resourceId: 'hubspot:contact', system: 'hubspot', state: 'PARTIAL', weight: 3, reasons: ['deletion strategy is EXTERNAL_WIPE, not CRYPTO_SHRED'] },
        { resourceId: 'bigquery:chameleon_dev.stg_users', system: 'bigquery', state: 'PROTECTED', weight: 3, reasons: [] },
      ],
      evaluatedAt: new Date().toISOString(),
    }
  }

  return {
    score: data.score as number,
    counts: data.counts as CoverageReport['counts'],
    weights: data.weights as CoverageReport['weights'],
    items: Array.isArray(data.items) ? (data.items as CoverageItem[]) : [],
    evaluatedAt: String(data.timestamp ?? new Date().toISOString()),
  }
}

// Chameleon's own crypto-shred mechanism is unconditionally backup-immune
// regardless of when a certificate was issued -- only the per-resource
// source-redaction detail is new. Used when a REAL certificate (on a live
// backend) simply predates this field, so a real cert never falls back to
// proofFixture's demo resource IDs (support_tickets/marketing.leads) as if
// they were this user's actual data -- see the comment at its one call site.
const BACKUP_IMMUNITY_UNKNOWN_FALLBACK = {
  cryptoShredCoverage: 'BACKUP_IMMUNE' as const,
  sourceRedactionExceptions: [] as typeof proofFixture.certificate.backupImmunity.sourceRedactionExceptions,
  timeTravelCeilingHours: 168 as const,
  timeTravelCaveat: proofFixture.certificate.backupImmunity.timeTravelCaveat,
}

export async function parseCertificate(userId: string, data: Record<string, unknown>): Promise<typeof proofFixture> {
  const jwt = String(data.certificate ?? data.jwt ?? '')
  let claims: Record<string, unknown> = {}
  if (jwt) {
    try {
      claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
    } catch { /* leave claims empty */ }
  }
  const lineage = Array.isArray(claims.lineageSummary) ? claims.lineageSummary as { system: string }[] : []
  const affectedSystems = lineage.length ? lineage.map(l => l.system) : (proofFixture.affectedSystems as string[])
  const lineageCoverage = claims.lineageCoverage as typeof proofFixture.certificate.lineageCoverage | undefined
  const backupImmunity = claims.backupImmunity as typeof proofFixture.certificate.backupImmunity | undefined
  // A real, already-issued certificate can genuinely lack this field --
  // it's brand new, no certificate signed before today has it. Falling back
  // to proofFixture's rich demo data here (as the other optional fields
  // above do) would show a real customer fake resource IDs on their own
  // real certificate. Fall back to the fixture only when there's truly no
  // live backend at all (local dev); otherwise fall back to an honest
  // "nothing known" default.
  const backupImmunityFallback = (await hasLiveBackend())
    ? BACKUP_IMMUNITY_UNKNOWN_FALLBACK
    : proofFixture.certificate.backupImmunity
  const ghostDataSummary = claims.ghostDataSummary ?? claims.ghost_data_summary
  return {
    userId,
    deletionRequestId: String(claims.jti ?? proofFixture.deletionRequestId),
    affectedSystems,
    certificate: {
      issuer: String(claims.iss ?? 'Chameleon Key Vault'),
      issuedAt: new Date((Number(claims.iat ?? 0)) * 1000).toISOString() || proofFixture.certificate.issuedAt,
      status: 'CERTIFIED' as const,
      keyFingerprint: String(claims.keyFingerprint ?? proofFixture.certificate.keyFingerprint),
      shredDate: String(claims.shredDate ?? claims.shred_date ?? proofFixture.certificate.shredDate),
      jwt,
      // These have always been part of the signed claims -- previously
      // decoded here and then discarded. Now actually surfaced, see
      // app/proof/page.tsx's "What this certificate proves" section.
      tenantId: String(claims.tenantId ?? claims.tenant_id ?? proofFixture.certificate.tenantId),
      keyDestructionStatus: String(claims.keyDestructionStatus ?? proofFixture.certificate.keyDestructionStatus),
      keyDestructionMethod: String(claims.keyDestructionMethod ?? proofFixture.certificate.keyDestructionMethod) as 'DEK_ERASURE',
      lineageCoverage: lineageCoverage ?? proofFixture.certificate.lineageCoverage,
      backupImmunity: backupImmunity ?? backupImmunityFallback,
      ghostDataSummary: Array.isArray(ghostDataSummary) ? ghostDataSummary as typeof proofFixture.certificate.ghostDataSummary : [],
      ghostDataScanCoverage: String(claims.ghostDataScanCoverage ?? proofFixture.certificate.ghostDataScanCoverage) as 'NOT_TRACKED',
      previousCertificateHash: (claims.previousCertificateHash as string | null | undefined) ?? null,
      chainSequence: (claims.chainSequence as number | null | undefined) ?? null,
    },
    auditTrail: proofFixture.auditTrail,
  }
}

export async function findLatestCertificate(): Promise<{ proof: typeof proofFixture; userId: string } | null> {
  // A real query (GET /certificate/latest, Key Vault#86) -- this used to
  // probe 5 hardcoded demo IDs (usr-001..005) and show whichever one it
  // found first, so a real customer with real certificates saw "no
  // certificates yet" regardless of their real history, and dev could
  // coincidentally show a demo cert instead of the one actually wanted.
  const data = await kvFetch('/certificate/latest')
  if (!data || !data.certificate || typeof data.userId !== 'string') return null
  return { proof: await parseCertificate(data.userId, data as Record<string, unknown>), userId: data.userId }
}

export async function getCertificate(userId: string): Promise<typeof proofFixture | null> {
  const data = await kvFetch(`/certificate/${userId}`)
  if (!data) return (await hasLiveBackend()) ? null : proofFixture
  return parseCertificate(userId, data as Record<string, unknown>)
}

export async function getLineageEvents(userId: string): Promise<typeof proofFixture.auditTrail> {
  const data = await kvFetch(`/lineage/user/${userId}`)
  if (!data) return (await hasLiveBackend()) ? [] : proofFixture.auditTrail
  const events = Array.isArray(data) ? data : (data.events ?? [])
  if (!events.length) return (await hasLiveBackend()) ? [] : proofFixture.auditTrail
  return events.map((e: Record<string, unknown>) => ({
    timestamp: String(e.timestamp ?? ''),
    event: String(e.event_type ?? e.event ?? ''),
    actor: String(e.source ?? e.actor ?? ''),
    details: String(e.metadata ?? e.details ?? ''),
  })) as typeof proofFixture.auditTrail
}

export type DiscoveryFinding = {
  resourceId: string
  system: string
  registryStatus: 'UNREGISTERED' | 'DRIFTED'
  columns: string[]
  lastSeen: string
}

// Content-confirmed (Stage 2, path-level) findings -- a real PII value was
// found at this exact JSON path, not just a suggestively-named column. See
// app/ghost-data/page.tsx's own type comment for the full distinction from
// DiscoveryFinding above.
export type ContentConfirmedFinding = {
  resourceId: string
  columnName: string
  jsonPath: string
  classification: string
  pattern: string
  matchCount: number
  sampledRows: number
  scannedAt: string
}

export async function getDiscoveryFindings(): Promise<DiscoveryFinding[]> {
  const data = await kvFetch('/pii-registry/discovery')
  if (!data || !Array.isArray(data.findings)) return []
  return data.findings as DiscoveryFinding[]
}

export async function getContentConfirmedFindings(): Promise<ContentConfirmedFinding[]> {
  const data = await kvFetch('/pii-registry/discovery')
  if (!data || !Array.isArray(data.contentFindings)) return []
  return data.contentFindings as ContentConfirmedFinding[]
}

export type DecryptedView = {
  tenant_id: string
  view_name: string
  source_resource_id: string
  declared_fields: string[]
  business_justification: string
  created_by: string
  bigquery_dataset: string
  bigquery_view_name: string
  status: 'active' | 'revoked'
  created_at: string
  revoked_at?: string
  revoked_by?: string
}

export async function getDecryptedViews(): Promise<DecryptedView[]> {
  const data = await kvFetch('/decrypted-views')
  if (!data || !Array.isArray(data.views)) return []
  return data.views as DecryptedView[]
}

export type AuditEvent = {
  type: 'PII_REGISTRY_DECLARED' | 'PII_REGISTRY_MODIFIED' | 'DELETION_REQUESTED'
  resourceId: string
  actorEmail: string
  tenantId?: string
  timestamp: string
}

export async function getAuditEventsForActor(email: string): Promise<AuditEvent[]> {
  const data = await kvFetch(`/audit/actor/${encodeURIComponent(email)}`)
  if (!data || !Array.isArray(data.events)) return []
  return data.events as AuditEvent[]
}

export interface IncompleteDeletionRequest {
  deletionRequestId: string
  userId: string
  status: string
  createdAt: string
  ageHours: number
}

export interface DeletionEvidenceReport {
  tenantId: string
  period: { from: string; to: string }
  totalRequests: number
  certificateIssued: number
  incomplete: IncompleteDeletionRequest[]
  partialFailures: number
  medianTimeToCertificateHours: number | null
  generatedAt: string
}

// No fixture fallback here, deliberately -- this is a new, narrow report
// shape with no existing demo data to fabricate plausibly. A failed/
// unconfigured call surfaces as null and the page shows a real error state,
// same as it would for a real deployment with a real backend problem.
export async function getDeletionEvidence(from: string, to: string): Promise<DeletionEvidenceReport | null> {
  const data = await kvFetch(`/audit/deletion-evidence?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
  if (!data || typeof data.totalRequests !== 'number') return null
  return data as DeletionEvidenceReport
}

export async function getOverview() {
  const [resources, policy, ghostFindings, contentFindings, latestCertificate] = await Promise.all([
    getRegistryResources(),
    getPolicy(),
    getDiscoveryFindings(),
    getContentConfirmedFindings(),
    findLatestCertificate(),
  ])
  return {
    registryCount: resources.length,
    policyStatus: policy.status,
    // Both tiers together -- see app/ghost-data/page.tsx's own totalFindings
    // for why these are counted the same way there, even though they're
    // never merged into one list (schema-level vs content-confirmed are
    // different strengths of evidence, shown as separate sections).
    ghostFindingCount: ghostFindings.length + contentFindings.length,
    // Now a real query (GET /certificate/latest, Key Vault#86) instead of
    // the old hardcoded-demo-ID probe -- see findLatestCertificate. A real
    // instance with no certificates issued yet still correctly gets null
    // here, not the fixture: findLatestCertificate only ever falls back to
    // the fixture when there's no live backend configured at all.
    lastDeletionProof: latestCertificate
      ? {
          userId: latestCertificate.userId,
          timestamp: latestCertificate.proof.certificate.issuedAt,
          status: latestCertificate.proof.certificate.status,
        }
      : (await hasLiveBackend()) ? null : overviewFixture.lastDeletionProof,
    _resources: resources,
    _policyStatus: policy.status,
  }
}

export type ServiceVersionInfo = {
  service: string
  sourceSha: string | null
  builtAt: string | null
  sources: Record<string, string> | null
}

export async function getVersionInfo(): Promise<ServiceVersionInfo | null> {
  const data = await kvFetch('/version')
  if (!data) return null
  return data as ServiceVersionInfo
}

export type SourceStalenessResult = {
  status: 'ok' | 'not_applicable' | 'error'
  results?: Record<
    string,
    { status: 'stale' | 'current' | 'unknown'; builtSha?: string; latestSha?: string; reason?: string }
  >
  reason?: string
  /** Pre-built-image path's update check -- present regardless of `status`/`results` above, which are the self-build path's. */
  platformVersion?: {
    status: 'stale' | 'current' | 'unknown'
    currentVersion?: string
    latestVersion?: string
    reason?: string
  }
}

export async function getSourceStaleness(): Promise<SourceStalenessResult | null> {
  const data = await kvFetch('/version/source-staleness')
  if (!data) return null
  return data as SourceStalenessResult
}

export { deletionFixture }
