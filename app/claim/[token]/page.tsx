import { ClaimClient } from './ClaimClient'

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Chameleon</h1>
          <p className="mt-1 text-sm text-gray-500">Claim your Key Vault credential</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm px-6 py-6">
          <ClaimClient token={token} />
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          This link works once. Treat the credential like a password once revealed.
        </p>
      </div>
    </div>
  )
}
