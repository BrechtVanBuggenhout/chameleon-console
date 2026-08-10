import { NextResponse } from 'next/server'

/**
 * GET /api/version — reports the git SHA this console was built from, if
 * known, so a redeploy can be verified with a curl instead of a login.
 *
 * Deliberately reads VAULT_BASE_URL directly rather than going through
 * getActiveProjectContext() (project-context.ts): that helper requires an
 * authenticated session or the operator password, but this route is meant
 * to be reachable unauthenticated (see proxy.ts's matcher) the same way
 * Key Vault's own /health and /version are — it's a deployment-level fact,
 * not scoped to any customer project. Key Vault's /version already holds
 * the source SHAs for all 3 services (from the chameleon-source-shas
 * secret build-own-images.sh writes), so this just proxies that instead of
 * needing its own Secret Manager IAM grant.
 */
export async function GET() {
  const vaultBaseUrl = process.env.VAULT_BASE_URL
  let sourceSha: string | null = null
  let builtAt: string | null = null

  if (vaultBaseUrl) {
    try {
      const res = await fetch(`${vaultBaseUrl}/version`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        sourceSha = data?.sources?.console ?? null
        builtAt = data?.sources?.builtAt ?? null
      }
    } catch {
      // Key Vault unreachable -- report nulls rather than failing this
      // route, same as the "secret not found" case below.
    }
  }

  return NextResponse.json({
    service: 'chameleon-console',
    sourceSha,
    builtAt,
  })
}
