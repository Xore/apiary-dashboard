import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { Token } from '@astryxdesign/core/Token'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { getReports } from '#/data/queries'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/reports/generated/$id')({
  loader: async ({ params }) => {
    const data = await getReports()
    const report = data.generated.find((g) => g.id === params.id)
    if (!report) throw notFound()
    return {
      report,
      definition: data.definitions.find((d) => d.id === report.definitionId),
      template: data.templates.find((t) => t.id === report.template),
    }
  },
  notFoundComponent: () => (
    <NotFound
      title="Generated report"
      description="No generated report has this id; it may have been deleted."
    />
  ),
  component: GeneratedReportPage,
})

function GeneratedReportPage() {
  const { report: r, definition, template } = Route.useLoaderData()
  return (
    <EntityFrame
      kind="Generated report"
      title={r.title}
      basePath={`/reports/generated/${r.id}`}
      tokens={
        <Token
          size="sm"
          label={r.origin}
          color={r.origin === 'schedule' ? 'blue' : 'gray'}
        />
      }
      facts={[
        { label: 'Created', value: formatDateTime(r.createdAt) },
        { label: 'Template', value: template?.name ?? r.template },
        { label: 'Size', value: `${Math.round(r.sizeBytes / 1024)} KB` },
        {
          label: 'Definition',
          value: definition ? (
            <Link href={`/reports/definitions/${definition.id}`}>
              {definition.name}
            </Link>
          ) : (
            'deleted'
          ),
        },
      ]}
    >
      <Panel title="Document">
        <EmptyState
          icon={<Icon icon={DocumentTextIcon} size="lg" />}
          title="PDF preview"
          description="The generated PDF renders here once the reports backend is wired. Mock data has no document to show."
        />
      </Panel>
    </EntityFrame>
  )
}
