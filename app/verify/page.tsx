import { VerifyForm } from './verify-form'

export default function VerifyPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Verify a certificate</h1>
        <p className="mt-1 text-sm text-gray-500">
          Independent signature verification — no login, no trust in Chameleon required. Checks the
          certificate against this instance&apos;s own published signing keys, the same way any JWT
          library could.
        </p>
      </div>
      <VerifyForm />
    </div>
  )
}
