import {
  overviewFixture,
  registryFixtures,
  policyFixture,
  deletionFixture,
  proofFixture,
  integrationsFixture,
} from '@/lib/fixtures'
import type {
  RegistryResource,
} from '@/lib/fixtures'
import { TENANT_ID } from '@/lib/tenant'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

async function kvFetch(path: string) {
  if (!VAULT_BASE_URL) return null
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID }
    if (VAULT_API_TOKEN) headers['Authorization'] = `Bearer ${VAULT_API_TOKEN}`
    const res = await fetch(`${VAULT_BASE_URL}${path}`, {
      headers,
      next: { revalidate: 30 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getRegistryResources(): Promise<RegistryResource[]> {
  const data = await kvFetch('/pii-registry/resources')
  if (!data) return registryFixtures
  // KV returns { resources: [...] }
  const resources = Array.isArray(data) ? data : (data.resources ?? [])
  if (!resources.length) return registryFixtures
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

const DEMO_USER_IDS = ['usr-001', 'usr-002', 'usr-003', 'usr-004', 'usr-005']

async function parseCertificate(userId: string, data: Record<string, unknown>): Promise<typeof proofFixture> {
  const jwt = String(data.certificate ?? data.jwt ?? '')
  let claims: Record<string, unknown> = {}
  if (jwt) {
    try {
      claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
    } catch { /* leave claims empty */ }
  }
  const lineage = Array.isArray(claims.lineageSummary) ? claims.lineageSummary as { system: string }[] : []
  const affectedSystems = lineage.length ? lineage.map(l => l.system) : (proofFixture.affectedSystems as string[])
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
    },
    auditTrail: proofFixture.auditTrail,
  }
}

export async function findLatestCertificate(): Promise<{ proof: typeof proofFixture; userId: string } | null> {
  for (const uid of DEMO_USER_IDS) {
    const data = await kvFetch(`/certificate/${uid}`)
    if (data && data.certificate) {
      return { proof: await parseCertificate(uid, data as Record<string, unknown>), userId: uid }
    }
  }
  return null
}

export async function getCertificate(userId: string): Promise<typeof proofFixture> {
  const data = await kvFetch(`/certificate/${userId}`)
  if (!data) return proofFixture
  return parseCertificate(userId, data as Record<string, unknown>)
}

export async function getLineageEvents(userId: string): Promise<typeof proofFixture.auditTrail> {
  const data = await kvFetch(`/lineage/user/${userId}`)
  if (!data) return proofFixture.auditTrail
  const events = Array.isArray(data) ? data : (data.events ?? [])
  if (!events.length) return proofFixture.auditTrail
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

export async function getDiscoveryFindings(): Promise<DiscoveryFinding[]> {
  const data = await kvFetch('/pii-registry/discovery')
  if (!data || !Array.isArray(data.findings)) return []
  return data.findings as DiscoveryFinding[]
}

export async function getOverview() {
  const [resources, policy, ghostFindings] = await Promise.all([
    getRegistryResources(),
    getPolicy(),
    getDiscoveryFindings(),
  ])
  return {
    registryCount: resources.length,
    policyStatus: policy.status,
    ghostFindingCount: ghostFindings.length,
    lastDeletionProof: overviewFixture.lastDeletionProof,
    _resources: resources,
    _policyStatus: policy.status,
  }
}

export { deletionFixture, integrationsFixture }
