import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { getReports } from '#/data/queries'
import type { ReportTemplate } from '#/data/types'
import { reportTabs } from '#/lib/navFamilies'

export const Route = createFileRoute('/_layout/reports/templates')({
  staticData: { viewTabs: reportTabs },
  loader: () => getReports(),
  component: TemplatesPage,
})

type Row = ReportTemplate & Record<string, unknown>

/** The starting points: what each template includes, and a way to use it. */
function TemplatesPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const label = (id: string) => data.elements.find((e) => e.id === id)?.label ?? id
  const inUse = (id: string) => data.definitions.filter((d) => d.template === id).length
  const use = (id: string) => `/reports/generate?template=${id}`

  const columns: TableColumn<Row>[] = [
    { key: 'name', header: 'Template', width: pixel(200), renderCell: (row) => <Text weight="semibold">{row.name}</Text> },
    { key: 'description', header: 'For', width: proportional(2), renderCell: (row) => <Text type="supporting">{row.description}</Text> },
    {
      key: 'elements',
      header: 'Sections',
      width: proportional(3),
      renderCell: (row) => (
        <HStack gap={1} wrap="wrap">
          {row.elements.map((id) => (
            <Token key={id} size="sm" label={label(id)} />
          ))}
        </HStack>
      ),
    },
    { key: 'id', header: 'Definitions', width: pixel(104), align: 'end', renderCell: (row) => inUse(row.id) },
    { key: 'use', header: '', width: pixel(128), renderCell: (row) => <Button label="Use template" size="sm" variant="secondary" onClick={() => void navigate({ href: use(row.id) })} /> },
  ]

  return (
    <RecordList
      title="Report templates"
      description="Each template preselects the sections a kind of report needs. Pick one to start the Generate wizard from it; every section can still be changed there."
      rows={data.templates as Row[]}
      columns={columns}
      getId={(row) => row.id}
      getHref={(row) => use(row.id)}
      emptyState={{ title: 'No templates', description: 'Templates ship with the reports backend.' }}
    />
  )
}
