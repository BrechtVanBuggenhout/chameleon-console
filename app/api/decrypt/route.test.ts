import { NextRequest } from 'next/server'

jest.mock('../../../lib/project-context', () => ({
  getActiveProjectContext: jest.fn(),
}))
jest.mock('../../../lib/session-credential', () => ({
  resolveWriteAuthHeaders: jest.fn(),
}))

const { getActiveProjectContext } = jest.requireMock('../../../lib/project-context') as {
  getActiveProjectContext: jest.Mock
}
const { resolveWriteAuthHeaders } = jest.requireMock('../../../lib/session-credential') as {
  resolveWriteAuthHeaders: jest.Mock
}

import { POST } from './route'

const CONTEXT = {
  projectId: 'proj-1',
  vaultBaseUrl: 'https://vault.test',
  tenantId: 'tenant-1',
  vaultApiToken: 'shared-token',
  vaultRegistryWriteToken: undefined,
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/decrypt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/decrypt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 503 when there is no active project context', async () => {
    getActiveProjectContext.mockResolvedValue(null)

    const res = await POST(postRequest({ resourceId: 'x' }))

    expect(res.status).toBe(503)
  })

  it('sends the resolved auth headers (per-session attribution) to Key Vault, not the raw fallback', async () => {
    getActiveProjectContext.mockResolvedValue(CONTEXT)
    const attributedHeaders = { 'Content-Type': 'application/json', 'x-tenant-id': 'tenant-1', Authorization: 'Bearer per-session-cred' }
    resolveWriteAuthHeaders.mockResolvedValue(attributedHeaders)
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ value: 'decrypted' }), { status: 200 })) as unknown as typeof fetch

    const res = await POST(postRequest({ resourceId: 'x', field: 'email' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ value: 'decrypted' })
    expect(resolveWriteAuthHeaders).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({ 'x-tenant-id': 'tenant-1', Authorization: 'Bearer shared-token' })
    )
    expect(global.fetch).toHaveBeenCalledWith(
      'https://vault.test/pii-vault/decrypt',
      expect.objectContaining({ headers: attributedHeaders })
    )
  })

  it('passes through a Key Vault error status and body verbatim', async () => {
    getActiveProjectContext.mockResolvedValue(CONTEXT)
    resolveWriteAuthHeaders.mockResolvedValue({ Authorization: 'Bearer shared-token' })
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'not found' }), { status: 404 })) as unknown as typeof fetch

    const res = await POST(postRequest({ resourceId: 'missing' }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toEqual({ error: 'not found' })
  })
})
