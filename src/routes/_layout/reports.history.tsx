import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { deleteGeneratedReport, getReports } from '#/data/queries'
import type { GeneratedReport } from '#/data/types'
import { formatDateTime } from '#/lib/format'

type Origin = 'manual' | 'schedule'

export const Route = createFileRoute('/_layout/reports/history')({
  validateSearch: (search: Record<string, unknown>): { origin?: Origin } => ({
    origin: search.origin === 'manual' || search.origin === 'schedule' ? search.origin : undefined,
  }),
  loader: () => getReports(),
  component: HistoryPage,
})

/** Every PDF generated, newest first; a row opens the report. */
function HistoryPage() {
  const data = Route.useLoaderData()
  const { origin } = Route.useSearch()
  const router = useRouter()
  const [confirm, setConfirm] = useState<GeneratedReport | null>(null)
  const [busy, setBusy] = useState(false)
  const templateName = (id: string) => data.templates.find((t) => t.id === id)?.name ?? id
  const definitionName = (id: string) => data.definitions.find((d) => d.id === id)?.name
  const rows = data.generated.filter((r) => !origin || r.origin === origin)

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
          <HStack gap={1.5} wrap="wrap">
            <Token size="sm" label={`All (${data.generated.length})`} color={origin ? 'default' : 'blue'} href="/reports/history" />
            <Token size="sm" label={`Manual (${data.generated.filter((r) => r.origin === 'manual').length})`} color={origin === 'manual' ? 'blue' : 'default'} href="/reports/history?origin=manual" />
            <Token size="sm" label={`Scheduled (${data.generated.filter((r) => r.origin === 'schedule').length})`} color={origin === 'schedule' ? 'blue' : 'default'} href="/reports/history?origin=schedule" />
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
