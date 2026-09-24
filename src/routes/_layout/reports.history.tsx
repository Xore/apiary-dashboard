import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { FilterSelect, listParam, toParam } from '#/components/FilterSelect'
import { RecordList } from '#/components/RecordList'
import { deleteGeneratedReport, getReports } from '#/data/queries'
import type { GeneratedReport } from '#/data/types'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/reports/history')({
  validateSearch: (search: Record<string, unknown>): { origin?: string; template?: string } => ({
    origin: toParam(listParam(search.origin).filter((o) => o === 'manual' || o === 'schedule')),
    template: toParam(listParam(search.template)),
  }),
  loader: () => getReports(),
  component: HistoryPage,
})

/** Every PDF generated, newest first; a row opens the report. */
function HistoryPage() {
  const data = Route.useLoaderData()
  const { origin, template } = Route.useSearch()
  const navigate = Route.useNavigate()
  const origins = listParam(origin)
  const templates = listParam(template)
  const setFilter = (patch: { origin?: string; template?: string }) => void navigate({ search: (prev) => ({ ...prev, ...patch }) })
  const router = useRouter()
  const [confirm, setConfirm] = useState<GeneratedReport | null>(null)
  const [busy, setBusy] = useState(false)
  const templateName = (id: string) => data.templates.find((t) => t.id === id)?.name ?? id
  const definitionName = (id: string) => data.definitions.find((d) => d.id === id)?.name
  const rows = data.generated.filter((r) => (!origins.length || origins.includes(r.origin)) && (!templates.length || templates.includes(r.template)))
  const count = (of: (r: GeneratedReport) => string, value: string) => data.generated.filter((r) => of(r) === value).length

  const columns: TableColumn<GeneratedReport>[] = [
    { key: 'createdAt', header: 'Generated', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.createdAt)}</Text> },
    { key: 'title', header: 'Title', width: proportional(2), renderCell: (row) => <Text weight="semibold">{row.title}</Text> },
    { key: 'template', header: 'Template', width: pixel(168), renderCell: (row) => templateName(row.template) },
    { key: 'definitionId', header: 'From', width: proportional(1), renderCell: (row) => <Text type="supporting">{definitionName(row.definitionId) ?? (row.definitionId ? 'deleted definition' : 'one-off')}</Text> },
    { key: 'origin', header: 'Origin', width: pixel(96), renderCell: (row) => <Token size="sm" label={row.origin} color={row.origin === 'schedule' ? 'blue' : 'gray'} /> },
    { key: 'sizeBytes', header: 'Size', width: pixel(80), align: 'end', renderCell: (row) => `${Math.round(row.sizeBytes / 1024)} KB` },
    { key: 'id', header: '', width: pixel(96), renderCell: (row) => <Button label="Delete" size="sm" variant="ghost" onClick={() => setConfirm(row)} /> },
  ]

  return (
    <>
      <RecordList
        title="Report history"
        description="Every PDF the studio produced, by hand or on a schedule."
        actions={<Button label="Generate a report" size="sm" onClick={() => void router.navigate({ href: '/reports/generate' })} />}
        toolbar={
          <HStack gap={2} wrap="wrap">
            <FilterSelect
              label="Origin"
              isLabelHidden
              size="sm"
              width={180}
              placeholder="Manual and scheduled"
              options={[
                { value: 'manual', label: 'Manual', count: count((r) => r.origin, 'manual') },
                { value: 'schedule', label: 'Scheduled', count: count((r) => r.origin, 'schedule') },
              ]}
              value={origins}
              onChange={(values) => setFilter({ origin: toParam(values) })}
            />
            <FilterSelect
              label="Template"
              isLabelHidden
              size="sm"
              width={200}
              placeholder="Any template"
              options={data.templates.map((t) => ({ value: t.id, label: t.name, count: count((r) => r.template, t.id) }))}
              value={templates}
              onChange={(values) => setFilter({ template: toParam(values) })}
            />
          </HStack>
        }
        rows={rows}
        columns={columns}
        getId={(row) => row.id}
        getHref={(row) => `/reports/generated/${row.id}`}
        emptyState={{ title: 'No reports yet', description: 'Generate one, or wait for a scheduled definition to run.' }}
      />
      <AlertDialog
        isOpen={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete this report?"
        description={`“${confirm?.title ?? ''}” generated ${confirm ? formatDateTime(confirm.createdAt) : ''} will be removed permanently.`}
        actionLabel="Delete"
        isActionLoading={busy}
        onAction={async () => {
          if (!confirm) return
          setBusy(true)
          try {
            await deleteGeneratedReport(confirm.id)
            await router.invalidate()
          } finally {
            setBusy(false)
            setConfirm(null)
          }
        }}
      />
    </>
  )
}
