import { getRegistryResources } from '@/lib/vault-api'
import { PUBSUB_INGEST_BASE_URL } from '@/lib/pubsub-ingest'
import { RegistryHeader } from './registry-header'
import { RegistryTable } from './registry-table'

export default async function RegistryPage() {
  const registryResources = await getRegistryResources()
  return (
    <div>
      <RegistryHeader resourceCount={registryResources.length} pubsubIngestBaseUrl={PUBSUB_INGEST_BASE_URL} />
      <RegistryTable resources={registryResources} pubsubIngestBaseUrl={PUBSUB_INGEST_BASE_URL} />
    </div>
  )
}
