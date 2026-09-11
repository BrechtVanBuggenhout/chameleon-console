jest.mock('./project-context', () => ({
  getActiveProjectContext: jest.fn(),
}))

const { getActiveProjectContext } = jest.requireMock('./project-context') as {
  getActiveProjectContext: jest.Mock
}

import { parseCertificate } from './vault-api'
import { proofFixture } from './fixtures'

function buildJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'PS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${header}.${payload}.fake-signature`
}

describe('parseCertificate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // "Live backend" for most tests -- the real-deployment case, where
    // fixture fallbacks for genuinely-missing fields must NOT silently
    // show demo data to a real customer.
    getActiveProjectContext.mockResolvedValue({ projectId: 'proj-1' })
  })

  it('maps a full, realistic set of claims to the expected UI shape', async () => {
    const jwt = buildJwt({
      jti: 'del-req-real-1',
      iss: 'Chameleon Key Vault',
      iat: 1780000000,
      keyFingerprint: 'sha256:real-fingerprint',
      shredDate: '2026-09-01T00:00:00Z',
      tenantId: 'real-tenant',
      keyDestructionStatus: 'COMPLETE',
      keyDestructionMethod: 'DEK_ERASURE',
      lineageSummary: [{ system: 'hubspot' }, { system: 'salesforce' }],
      lineageCoverage: { destinationsChecked: 2, destinationsSucceeded: 2, knownDestinationTypes: ['hubspot', 'salesforce'] },
      ghostDataSummary: [{ resourceId: 'x', found: true }],
      ghostDataScanCoverage: 'NOT_TRACKED',
      previousCertificateHash: 'abc123',
      chainSequence: 5,
    })

    const result = await parseCertificate('user-1', { certificate: jwt })

    expect(result.userId).toBe('user-1')
    expect(result.deletionRequestId).toBe('del-req-real-1')
    expect(result.affectedSystems).toEqual(['hubspot', 'salesforce'])
    expect(result.certificate.tenantId).toBe('real-tenant')
    expect(result.certificate.keyFingerprint).toBe('sha256:real-fingerprint')
    expect(result.certificate.shredDate).toBe('2026-09-01T00:00:00Z')
    expect(result.certificate.lineageCoverage).toEqual({ destinationsChecked: 2, destinationsSucceeded: 2, knownDestinationTypes: ['hubspot', 'salesforce'] })
    expect(result.certificate.ghostDataSummary).toEqual([{ resourceId: 'x', found: true }])
    expect(result.certificate.previousCertificateHash).toBe('abc123')
    expect(result.certificate.chainSequence).toBe(5)
  })

  it('falls back to snake_case claim keys when the camelCase key is absent', async () => {
    const jwt = buildJwt({
      tenant_id: 'snake-case-tenant',
      shred_date: '2026-09-01T00:00:00Z',
      ghost_data_summary: [{ resourceId: 'y', found: false }],
    })

    const result = await parseCertificate('user-1', { certificate: jwt })

    expect(result.certificate.tenantId).toBe('snake-case-tenant')
    expect(result.certificate.shredDate).toBe('2026-09-01T00:00:00Z')
    expect(result.certificate.ghostDataSummary).toEqual([{ resourceId: 'y', found: false }])
  })

  it('does not throw on a malformed/undecodable JWT, and falls back to fixture defaults', async () => {
    const result = await parseCertificate('user-1', { certificate: 'not-a-real-jwt' })

    expect(result.userId).toBe('user-1')
    expect(result.certificate.issuer).toBe('Chameleon Key Vault')
  })

  it('does not throw when there is no certificate/jwt field at all', async () => {
    const result = await parseCertificate('user-1', {})

    expect(result.userId).toBe('user-1')
  })

  it('a real certificate missing backupImmunity (predates the field) gets an honest "no known exceptions" default, not the rich fixture demo data', async () => {
    // Regression test for a real bug fixed earlier: a real already-issued
    // certificate with no backupImmunity field was showing the fixture's
    // fake demo resource IDs as if they were this real customer's own
    // data. getActiveProjectContext is mocked to report a live backend
    // (set in beforeEach) -- exactly the case that must NOT fall back to
    // proofFixture's rich demo backupImmunity block.
    const jwt = buildJwt({ tenantId: 'real-tenant' }) // no backupImmunity claim at all

    const result = await parseCertificate('user-1', { certificate: jwt })

    expect(result.certificate.backupImmunity.cryptoShredCoverage).toBe('BACKUP_IMMUNE')
    expect(result.certificate.backupImmunity.sourceRedactionExceptions).toEqual([])
    // Specifically NOT the fixture's demo exceptions (support_tickets/marketing.leads).
    expect(result.certificate.backupImmunity).not.toEqual(proofFixture.certificate.backupImmunity)
  })

  it('with no live backend at all (local dev), falls back to the rich fixture demo data instead', async () => {
    getActiveProjectContext.mockResolvedValue(null)
    const jwt = buildJwt({ tenantId: 'irrelevant-in-local-dev' })

    const result = await parseCertificate('user-1', { certificate: jwt })

    expect(result.certificate.backupImmunity).toEqual(proofFixture.certificate.backupImmunity)
  })

  it('defaults ghostDataSummary to an empty array when the claim is present but not an array', async () => {
    const jwt = buildJwt({ ghostDataSummary: 'not-an-array' })

    const result = await parseCertificate('user-1', { certificate: jwt })

    expect(result.certificate.ghostDataSummary).toEqual([])
  })
})
