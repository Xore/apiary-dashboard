import { SkeletonPanels } from '#/components/EntityBlocks'
import { Pending } from '#/components/Pending'
import { orPending } from '#/lib/pending'
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
  pendingComponent: ProblemReportPage,
})

function ProblemReportPage() {
  const d = orPending(Route.useLoaderData())
  const { id } = Route.useParams()
  return (
    <EntityFrame
      kind="Problem report"
      title={<Pending width={280}>{d && `Problem on ${d.page}`}</Pending>}
      basePath={`/problem-reports/${encodeURIComponent(id)}`}
      facts={[
        { label: 'Submitted', value: d && formatDateTime(d.submittedAt) },
        { label: 'By', value: d?.submittedBy },
        { label: 'Status', value: d?.status },
      ]}
    >
      {d ? <ReportInspector key={d.id} report={d} /> : <SkeletonPanels />}
    </EntityFrame>
  )
}
