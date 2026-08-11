import { getActiveSession, type ActiveProjectContext } from './project-context'

/**
 * Resolves the auth headers a mutating Key Vault call (registry declare/
 * update/remove, deletion-request creation) should use. Prefers minting a
 * short-lived, per-person credential via the Key Vault's
 * POST /admin/session-credentials when a real customer session is active,
 * so the write is attributable to a real individual -- Key Vault's
 * middleware/auth.ts resolves that credential exactly like a claim-link
 * analyst credential, on the same allowed paths.
 *
 * Falls back to `fallbackHeaders` (today's shared-token behavior) whenever
 * there's no per-person identity to attribute to -- the static
 * CONSOLE_PASSWORD break-glass fallback (context.projectId === null), no
 * signed-in session, or minting failing for any reason. Never blocks the
 * write itself on this being available: an honestly-unattributed write via
 * the shared credential is correct behavior here, not a fallback to hide.
 */
export async function resolveWriteAuthHeaders(
  context: ActiveProjectContext,
  fallbackHeaders: Record<string, string>
): Promise<Record<string, string>> {
  if (context.projectId === null || !context.vaultApiToken) {
    return fallbackHeaders
  }

  const session = await getActiveSession()
  if (!session) return fallbackHeaders

  try {
    const res = await fetch(`${context.vaultBaseUrl}/admin/session-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': context.tenantId,
        Authorization: `Bearer ${context.vaultApiToken}`,
      },
      body: JSON.stringify({ email: session.email }),
      cache: 'no-store',
    })
    if (!res.ok) return fallbackHeaders

    const data = (await res.json()) as { credential?: string }
    if (!data.credential) return fallbackHeaders

    // Deliberately just the one header -- no x-api-key alongside it. Key
    // Vault's global auth hook reads x-api-key first when present, which
    // would make it check this value against the shared key instead of
    // resolving it as an analyst/session credential.
    return {
      'Content-Type': 'application/json',
      'x-tenant-id': context.tenantId,
      Authorization: `Bearer ${data.credential}`,
    }
  } catch {
    return fallbackHeaders
  }
}
