import { NextRequest } from 'next/server'

jest.mock('../../../../lib/project-context', () => ({
  getActiveProjectContext: jest.fn(),
}))
jest.mock('../../../../lib/session-credential', () => ({
  resolveWriteAuthHeaders: jest.fn(),
}))

const { getActiveProjectContext } = jest.requireMock('../../../../lib/project-context') as {
  getActiveProjectContext: jest.Mock
}
const { resolveWriteAuthHeaders } = jest.requireMock('../../../../lib/session-credential') as {
  resolveWriteAuthHeaders: jest.Mock
}

import { GET, POST } from './route'

const CONTEXT = {
  projectId: 'proj-1',
  vaultBaseUrl: 'https://vault.test',
  tenantId: 'tenant-1',
  vaultApiToken: 'shared-token',
  vaultRegistryWriteToken: undefined,
}

function getRequest(): NextRequest {
  return new NextRequest('http://localhost/api/deletion/req-1')
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/deletion/req-1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const params = Promise.resolve({ id: 'req-1' })

describe('GET /api/deletion/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 503 when there is no active project context', async () => {
    getActiveProjectContext.mockResolvedValue(null)

    const res = await GET(getRequest(), { params })

    expect(res.status).toBe(503)
  })

  it('polls the real deletion-request status endpoint', async () => {
    getActiveProjectContext.mockResolvedValue(CONTEXT)
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'CASCADE_PENDING' }), { status: 200 })) as unknown as typeof fetch

    const res = await GET(getRequest(), { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ status: 'CASCADE_PENDING' })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://vault.test/deletion-requests/req-1',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer shared-token' }) })
    )
  })
})

describe('POST /api/deletion/[id] (advance)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 503 when there is no active project context', async () => {
    getActiveProjectContext.mockResolvedValue(null)

    const res = await POST(postRequest({}), { params })

    expect(res.status).toBe(503)
  })

  it('advances the deletion request using per-session-attributed headers -- the real attribution-gap fix', async () => {
    // Before this fix, advancing a deletion request always used the raw
    // shared-token fallback, unlike creating one (app/api/deletion/route.ts),
    // which is already per-session-attributed. This pins the fix: advance
    // now goes through resolveWriteAuthHeaders exactly like create does.
    getActiveProjectContext.mockResolvedValue(CONTEXT)
    const attributedHeaders = { 'Content-Type': 'application/json', 'x-tenant-id': 'tenant-1', Authorization: 'Bearer per-session-cred' }
    resolveWriteAuthHeaders.mockResolvedValue(attributedHeaders)
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'CASCADE_COMPLETE' }), { status: 200 })) as unknown as typeof fetch

    const res = await POST(postRequest({}), { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ status: 'CASCADE_COMPLETE' })
    expect(resolveWriteAuthHeaders).toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalledWith(
      'https://vault.test/deletion-requests/req-1/advance',
      expect.objectContaining({ method: 'POST', headers: attributedHeaders })
    )
  })

  it('passes through a Key Vault error status and body verbatim', async () => {
    getActiveProjectContext.mockResolvedValue(CONTEXT)
    resolveWriteAuthHeaders.mockResolvedValue({ Authorization: 'Bearer shared-token' })
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'cannot advance from this state' }), { status: 409 })) as unknown as typeof fetch

    const res = await POST(postRequest({}), { params })
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body).toEqual({ error: 'cannot advance from this state' })
  })
})
