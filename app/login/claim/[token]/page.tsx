import { LoginClaimClient } from './LoginClaimClient'

/**
 * GET /login/claim/:token — the link a customer clicks from their login
 * email. Deliberately does NOT redeem the token itself: this route is a
 * plain GET, and corporate email scanners (Outlook Safe Links, Proofpoint,
 * Mimecast) prefetch every link in an inbound email to check it for malware
 * before the recipient ever sees it -- a GET-triggered redemption here would
 * be silently burned by that prefetch, exactly at the security-conscious
 * companies this product targets. Same reveal-on-click fix already applied
 * to the analyst-credential claim flow (see app/claim/[token]/page.tsx);
 * actual redemption happens only on a real click, via
 * app/api/login/claim/[token]/route.ts's POST.
 */
export default async function LoginClaimPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Chameleon</h1>
          <p className="mt-1 text-sm text-gray-500">Finish signing in</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm px-6 py-6">
          <LoginClaimClient token={token} />
        </div>
      </div>
    </div>
  )
}
