import { getRegistryResources } from '@/lib/vault-api'
import { DecryptForm } from './decrypt-form'

export default async function DecryptPage() {
  const resources = await getRegistryResources()
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Decrypt</h1>
        <p className="mt-1 text-sm text-gray-500">
          Look up one user&apos;s real value for a declared PII field, on demand. Every lookup is logged.
        </p>
      </div>
      <DecryptForm resources={resources} />
    </div>
  )
}
