import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Link } from '@astryxdesign/core/Link'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { ReviewStep, describeSchedule } from '#/components/details/Report'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { getReports } from '#/data/queries'
import type { GeneratedReport } from '#/data/types'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/reports/definitions/$id')({
  loader: async ({ params }) => {
    const data = await getReports()
    const definition = data.definitions.find((d) => d.id === params.id)
    if (!definition) throw notFound()
    return {
      data,
      definition,
      generated: data.generated.filter((g) => g.definitionId === params.id),
    }
  },
  notFoundComponent: () => (
    <NotFound
      title="Report definition"
      description="No saved definition has this id."
    />
  ),
  component: DefinitionPage,
})

const generatedColumns: TableColumn<GeneratedReport>[] = [
  {
    key: 'createdAt',
    header: 'Created',
    width: pixel(184),
    renderCell: (row) => (
      <Text type="supporting">{formatDateTime(row.createdAt)}</Text>
    ),
  },
  {
    key: 'title',
    header: 'Title',
    width: proportional(2),
    renderCell: (row) => (
      <Link href={`/reports/generated/${row.id}`}>{row.title}</Link>
    ),
  },
  {
    key: 'origin',
    header: 'Origin',
    width: pixel(96),
    renderCell: (row) => (
      <Token
        size="sm"
        label={row.origin}
        color={row.origin === 'schedule' ? 'blue' : 'gray'}
      />
    ),
  },
  {
    key: 'sizeBytes',
    header: 'Size',
    width: pixel(80),
    align: 'end',
    renderCell: (row) => `${Math.round(row.sizeBytes / 1024)} KB`,
  },
]

function DefinitionPage() {
  const { data, definition: d, generated } = Route.useLoaderData()
  return (
    <EntityFrame
      kind="Report definition"
      title={d.name}
      basePath={`/reports/definitions/${d.id}`}
      actions={<Link href="/reports/library">Report library</Link>}
      facts={[
        { label: 'Schedule', value: describeSchedule(d.schedule) },
        { label: 'Created', value: formatDateTime(d.created) },
        { label: 'PDFs produced', value: String(generated.length) },
      ]}
    >
      <VStack gap={4}>
        <Panel title="What it produces">
          <ReviewStep draft={d} data={data} />
        </Panel>
        <Panel title={`Generated reports (${generated.length})`}>
          {generated.length ? (
            <Table
              data={generated}
              columns={generatedColumns}
              idKey="id"
              density="compact"
            />
          ) : (
            <Text type="supporting">
              This definition has not produced a PDF yet.
            </Text>
          )}
        </Panel>
      </VStack>
    </EntityFrame>
  )
}
