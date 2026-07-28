import { getRegistryResources } from '@/lib/vault-api'
import { RegistryHeader } from './registry-header'
import { RegistryTable } from './registry-table'

export default async function RegistryPage() {
  const registryResources = await getRegistryResources()
  return (
    <div>
      <RegistryHeader resourceCount={registryResources.length} />
      <RegistryTable resources={registryResources} />
    </div>
  )
}
