import { NextRequest, NextResponse } from 'next/server'
import { getDeletionEvidence } from '@/lib/vault-api'

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

// CSV formatting lives here, not in lib/vault-api.ts -- that file's job is
// fetching/shaping data from Key Vault; this route's job is presenting it
// for download. The compliance page fetches the same report as JSON to
// render the table, so both this route and the page call the exact same
// getDeletionEvidence, never two different queries that could drift.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  const report = await getDeletionEvidence(from, to)
  if (!report) {
    return NextResponse.json({ error: 'No deletion evidence available for this period' }, { status: 503 })
  }

  const header = ['deletion_request_id', 'user_id', 'status', 'created_at', 'age_hours']
  const rows = report.incomplete.map((item) =>
    [item.deletionRequestId, item.userId, item.status, item.createdAt, item.ageHours.toString()]
      .map(csvEscape)
      .join(',')
  )
  const summary = [
    `# tenant: ${report.tenantId}`,
    `# period: ${report.period.from} to ${report.period.to}`,
    `# total_requests: ${report.totalRequests}`,
    `# certificate_issued: ${report.certificateIssued}`,
    `# partial_failures: ${report.partialFailures}`,
    `# median_time_to_certificate_hours: ${report.medianTimeToCertificateHours ?? 'n/a'}`,
    `# generated_at: ${report.generatedAt}`,
  ]
  const csv = [...summary, header.join(','), ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="deletion-evidence-${from}-to-${to}.csv"`,
    },
  })
}
