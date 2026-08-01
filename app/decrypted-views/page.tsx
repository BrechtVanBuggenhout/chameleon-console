import { getDecryptedViews } from '@/lib/vault-api'
import { ViewsHeader } from './views-header'
import { ViewsTable } from './views-table'

export default async function DecryptedViewsPage() {
  const views = await getDecryptedViews()
  return (
    <div>
      <ViewsHeader viewCount={views.length} />
      <ViewsTable views={views} />
    </div>
  )
}
