import { createFileRoute, notFound } from '@tanstack/react-router'
import { ReportInspector } from '#/components/details/ProblemReport'
import { getProblemReports } from '#/data/queries'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/problem-reports/$id')({
  loader: async ({ params }) => {
    const row = (await getProblemReports()).find((r) => r.id === params.id)
    if (!row) throw notFound()
    return row
  },
  notFoundComponent: () => (
    <NotFound
      title="Problem report"
      description="No problem report has this id."
    />
  ),
  component: ProblemReportPage,
})

function ProblemReportPage() {
  const d = Route.useLoaderData()
  return (
    <EntityFrame
      kind="Problem report"
      title={`Problem on ${d.page}`}
      basePath={`/problem-reports/${encodeURIComponent(d.id)}`}
      facts={[
        { label: 'Submitted', value: formatDateTime(d.submittedAt) },
        { label: 'By', value: d.submittedBy },
        { label: 'Status', value: d.status },
      ]}
      tabs={[{ id: 'overview', label: 'Overview' }]}
    >
      <ReportInspector key={d.id} report={d} />
    </EntityFrame>
  )
}
