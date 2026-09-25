import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Link } from '@astryxdesign/core/Link'
import { HStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { describeSchedule } from '#/components/details/Report'
import { RecordList } from '#/components/RecordList'
import { deleteReportDefinition, generateReport, getReports } from '#/data/queries'
import type { GeneratedReport, ReportDefinition } from '#/data/types'
import { formatDateTime } from '#/lib/format'
import { useGuardedAction } from '#/lib/useGuardedAction'
import { FieldStatus } from '@astryxdesign/core/FieldStatus'

export const Route = createFileRoute('/_layout/reports/library')({
  loader: () => getReports(),
  component: LibraryPage,
})

/** Saved definitions: generate one now, reopen it in the wizard, or drop it. */
function LibraryPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const { error, guard } = useGuardedAction()
  const [confirm, setConfirm] = useState<ReportDefinition | null>(null)
  const [generated, setGenerated] = useState<GeneratedReport | null>(null)
  const lastRun = (id: string) => data.generated.find((r) => r.definitionId === id)?.createdAt

  const act = async (id: string, write: () => Promise<unknown>) => {
    setBusy(id)
    try {
      await guard(async () => {
        await write()
        await router.invalidate()
      })
    } finally {
      setBusy(null)
    }
  }

  const columns: TableColumn<ReportDefinition>[] = [
    { key: 'name', header: 'Definition', width: proportional(2), renderCell: (row) => <Text weight="semibold">{row.name}</Text> },
    { key: 'template', header: 'Template', width: pixel(168), renderCell: (row) => data.templates.find((t) => t.id === row.template)?.name ?? row.template },
    { key: 'schedule', header: 'Runs', width: proportional(2), renderCell: (row) => describeSchedule(row.schedule) },
    { key: 'created', header: 'Last generated', width: pixel(184), renderCell: (row) => <Text type="supporting">{lastRun(row.id) ? formatDateTime(lastRun(row.id)!) : 'never'}</Text> },
    {
      key: 'id',
      header: '',
      width: pixel(256),
      renderCell: (row) => (
        <HStack gap={1}>
          <Button label="Generate now" size="sm" isLoading={busy === row.id} onClick={() => void act(row.id, async () => setGenerated(await generateReport(row.id)))} />
          <Button label="Edit" size="sm" variant="secondary" onClick={() => void navigate({ href: `/reports/generate?from=${row.id}` })} />
          <Button label="Delete" size="sm" variant="ghost" onClick={() => setConfirm(row)} />
        </HStack>
      ),
    },
  ]

  return (
    <>
      <RecordList
        title="Report library"
        description="Definitions kept for reuse. Scheduled ones run on their own; any of them can be generated now or reopened in the wizard."
        actions={
          <HStack gap={2} vAlign="center">
            {error && <FieldStatus type="error" variant="detached" message={error} />}
            <Button label="New definition" size="sm" onClick={() => void navigate({ href: '/reports/generate' })} />
          </HStack>
        }
        summary={
          generated && (
            <Banner
              status="success"
              title={`Generated “${generated.title}”`}
              isDismissable
              onDismiss={() => setGenerated(null)}
              endContent={<Link href={`/reports/generated/${generated.id}`}>Open the report</Link>}
            />
          )
        }
        rows={data.definitions}
        columns={columns}
        getId={(row) => row.id}
        getHref={(row) => `/reports/definitions/${row.id}`}
        emptyState={{ title: 'No saved definitions', description: 'Generate a report and keep it as a definition to see it here.' }}
      />
      <AlertDialog
        isOpen={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete this definition?"
        description={`“${confirm?.name ?? ''}” will be removed permanently and stop running on its schedule. PDFs it already produced stay in History.`}
        actionLabel="Delete"
        isActionLoading={busy === confirm?.id}
        onAction={async () => {
          if (!confirm) return
          await act(confirm.id, () => deleteReportDefinition(confirm.id))
          setConfirm(null)
        }}
      />
    </>
  )
}
