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
  return new NextRequest('http://localhost/api/deletion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 503 when there is no active project context', async () => {
    getActiveProjectContext.mockResolvedValue(null)

    const res = await POST(postRequest({ userId: 'user-1' }))

    expect(res.status).toBe(503)
  })

  it('creates a deletion request using per-session-attributed headers', async () => {
    getActiveProjectContext.mockResolvedValue(CONTEXT)
    const attributedHeaders = { 'Content-Type': 'application/json', 'x-tenant-id': 'tenant-1', Authorization: 'Bearer per-session-cred' }
    resolveWriteAuthHeaders.mockResolvedValue(attributedHeaders)
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ deletionRequestId: 'req-1' }), { status: 200 })) as unknown as typeof fetch

    const res = await POST(postRequest({ userId: 'user-1' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ deletionRequestId: 'req-1' })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://vault.test/deletion-requests',
      expect.objectContaining({ method: 'POST', headers: attributedHeaders })
    )
  })

  it('passes through a Key Vault error status and body verbatim', async () => {
    getActiveProjectContext.mockResolvedValue(CONTEXT)
    resolveWriteAuthHeaders.mockResolvedValue({ Authorization: 'Bearer shared-token' })
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'user already has an active request' }), { status: 409 })) as unknown as typeof fetch

    const res = await POST(postRequest({ userId: 'user-1' }))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body).toEqual({ error: 'user already has an active request' })
  })
})
