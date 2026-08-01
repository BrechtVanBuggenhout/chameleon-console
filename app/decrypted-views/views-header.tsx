'use client'

import { useState } from 'react'
import { DeclarePanel } from './declare-panel'

export function ViewsHeader({ viewCount }: { viewCount: number }) {
  const [open, setOpen] = useState(false)
  const [panelKey, setPanelKey] = useState(0)

  function declareNew() {
    setPanelKey((k) => k + 1)
    setOpen(true)
  }

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Decrypted Views</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          BigQuery Authorized Views that decrypt declared PII fields live, at query time, for joining against
          your own mart tables — never materialized, kept structurally outside dbt&apos;s PII scan.{' '}
          {viewCount} {viewCount === 1 ? 'view' : 'views'} declared.
        </p>
      </div>
      <button
        onClick={declareNew}
        className="shrink-0 rounded-md bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Declare decrypted view
      </button>

      {open && <DeclarePanel key={panelKey} onClose={() => setOpen(false)} />}
    </div>
  )
}
