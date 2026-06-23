import {
  overviewFixture,
  registryFixtures,
  ghostDataFixtures,
  policyFixture,
  deletionFixture,
  proofFixture,
  integrationsFixture,
} from '@/lib/fixtures'
import type {
  RegistryResource,
} from '@/lib/fixtures'

const VAULT_BASE_URL = process.env.VAULT_BASE_URL
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN

async function kvFetch(path: string) {
  if (!VAULT_BASE_URL) return null
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
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
  return resources.map((r: Record<string, unknown>) => ({
    resourceId: r.resourceId ?? r.resource_id ?? '',
    system: r.system ?? r.ownerConnector ?? 'bigquery',
    displayName: r.displayName ?? r.display_name ?? r.resourceId ?? '',
    piiColumns: Array.isArray(r.piiColumns) ? r.piiColumns : (r.pii_columns ?? []),
    deletionStrategy: r.deletionStrategy ?? r.deletion_strategy ?? 'key_destroy',
    classification: r.classification ?? 'MEDIUM',
    status: r.status ?? 'declared',
    scanEnabled: r.scanEnabled ?? r.scan_enabled ?? false,
    ownerConnector: r.ownerConnector ?? r.owner_connector ?? 'pipelines',
  }))
}

export async function getPolicy(): Promise<typeof policyFixture> {
  const data = await kvFetch('/pii-registry/policy')
  if (!data) return policyFixture
  return {
    status: (data.status ?? policyFixture.status) as typeof policyFixture.status,
    evaluatedAt: data.evaluatedAt ?? data.evaluated_at ?? policyFixture.evaluatedAt,
    rules: (Array.isArray(data.rules) && data.rules.length ? data.rules : policyFixture.rules) as typeof policyFixture.rules,
  }
}

export async function getCertificate(userId: string): Promise<typeof proofFixture> {
  const data = await kvFetch(`/certificate/${userId}`)
  if (!data) return proofFixture
  return {
    userId,
    deletionRequestId: data.deletionRequestId ?? data.deletion_request_id ?? proofFixture.deletionRequestId,
    affectedSystems: (data.affectedSystems ?? data.affected_systems ?? proofFixture.affectedSystems) as string[],
    certificate: {
      issuer: data.issuer ?? proofFixture.certificate.issuer,
      issuedAt: data.issuedAt ?? data.issued_at ?? proofFixture.certificate.issuedAt,
      status: (data.status ?? proofFixture.certificate.status) as 'CERTIFIED',
      keyFingerprint: data.keyFingerprint ?? data.key_fingerprint ?? proofFixture.certificate.keyFingerprint,
      shredDate: data.shredDate ?? data.shred_date ?? proofFixture.certificate.shredDate,
      jwt: data.jwt ?? data.token ?? proofFixture.certificate.jwt,
    },
    auditTrail: proofFixture.auditTrail,
  }
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

export async function getOverview() {
  const [resources, policy] = await Promise.all([getRegistryResources(), getPolicy()])
  return {
    registryCount: resources.length,
    policyStatus: policy.status,
    ghostFindingCount: overviewFixture.ghostFindingCount,
    lastDeletionProof: overviewFixture.lastDeletionProof,
    _resources: resources,
    _policyStatus: policy.status,
  }
}

export { ghostDataFixtures, deletionFixture, integrationsFixture }
