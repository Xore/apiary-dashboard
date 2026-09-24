import { useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { searchTabs } from '#/components/ViewTabs'
import { entityHref } from '#/lib/entities'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { RecordList } from '#/components/RecordList'
import { abortGpuJob, getAnalysisResults } from '#/data/queries'
import { AnalysisRunDialog } from '#/components/dialogs/AnalysisRunDialog'
import type { AnalysisResult, AnalysisResultsData, AnalyzerTab, GpuJob } from '#/data/types'
import { formatTime } from '#/lib/format'
import { ADMIN_REQUIRED, useIsAdmin } from '#/lib/session'
import { useGuardedAction } from '#/lib/useGuardedAction'

const TABS: Array<{ id: AnalyzerTab; label: string }> = [
  { id: 'workbench', label: 'Workbench' },
  { id: 'static', label: 'Static analysis' },
  { id: 'yara', label: 'YARA' },
  { id: 'sandbox', label: 'Sandbox' },
  { id: 'ghidra', label: 'Ghidra' },
]

export const Route = createFileRoute('/_layout/payload-workbench/results')({
  staticData: {
    viewTabs: searchTabs({
      label: 'Analysis results views',
      param: 'tab',
      tabs: (loaded) => TABS.map((t) => ({ id: t.id, label: t.label, count: (loaded as AnalysisResultsData | undefined)?.results.filter((r) => r.analyzer === t.id).length })),
    }),
  },
  validateSearch: (search: Record<string, unknown>): { tab?: AnalyzerTab } => ({
    tab: TABS.some((t) => t.id === search.tab) ? (search.tab as AnalyzerTab) : undefined,
  }),
  loader: () => getAnalysisResults(),
  component: AnalysisResultsPage,
})

const STATE_COLOR = { queued: 'gray', running: 'blue', succeeded: 'green', failed: 'red', cancelled: 'gray' } as const

const time: TableColumn<AnalysisResult> = { key: 'at', header: 'Time', width: pixel(96), renderCell: (row) => <Text type="supporting">{formatTime(row.at)}</Text> }
const file: TableColumn<AnalysisResult> = { key: 'file', header: 'File', width: pixel(168), renderCell: (row) => <Text type="code">{row.file}</Text> }
const summary: TableColumn<AnalysisResult> = { key: 'summary', header: 'Summary', width: proportional(3) }

const COLUMNS: Record<AnalyzerTab, TableColumn<AnalysisResult>[]> = {
  workbench: [
    time,
    { key: 'recipe', header: 'Recipe', width: pixel(136), renderCell: (row) => <Token size="sm" label={row.recipe ?? '—'} /> },
    { key: 'state', header: 'State', width: pixel(112), renderCell: (row) => (row.state ? <Token size="sm" color={STATE_COLOR[row.state]} label={row.state} /> : '—') },
    file,
    { key: 'owner', header: 'Owner', width: proportional(1) },
  ],
  static: [time, file, summary],
  yara: [
    time,
    file,
    {
      key: 'matches',
      header: 'Matches',
      width: proportional(3),
      renderCell: (row) => (
        <HStack gap={1}>
          {(row.matches ?? []).map((rule) => (
            <Token key={rule} size="sm" color="orange" label={rule} />
          ))}
        </HStack>
      ),
    },
  ],
  sandbox: [
    time,
    file,
    { key: 'risk', header: 'Risk', width: pixel(80), align: 'end', renderCell: (row) => <Text weight="semibold">{row.risk ?? '—'}</Text> },
    { key: 'platform', header: 'Platform', width: pixel(120) },
    summary,
  ],
  ghidra: [time, file, summary],
}

/** Each result opens its analyzer's tab on the payload page. */
const RESULT_TAB: Record<AnalysisResult['analyzer'], string> = { workbench: '', static: '/static', yara: '/indicators', sandbox: '/sandbox', ghidra: '/ghidra' }

function resultHref(row: AnalysisResult): string {
  return `${entityHref('payload', row.hash) ?? '/payloads'}${RESULT_TAB[row.analyzer]}`
}




function GpuQueue({ jobs }: { jobs: GpuJob[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const isAdmin = useIsAdmin()
  const { error, guard, clearError } = useGuardedAction()
  const columns: TableColumn<GpuJob>[] = [
    { key: 'requestedAt', header: 'Requested', width: pixel(96), renderCell: (row) => <Text type="supporting">{formatTime(row.requestedAt)}</Text> },
    { key: 'jobType', header: 'Type', width: pixel(136) },
    { key: 'model', header: 'Model', width: proportional(2), renderCell: (row) => <Text type="code">{row.model}</Text> },
    { key: 'status', header: 'Status', width: pixel(104), renderCell: (row) => <Token size="sm" label={row.status} color={row.status === 'failed' ? 'red' : row.status === 'running' ? 'blue' : 'gray'} /> },
    { key: 'attempts', header: 'Attempts', width: pixel(80), align: 'end' },
    {
      key: 'jobId',
      header: '',
      width: pixel(96),
      renderCell: (row) =>
        row.status === 'queued' ? (
          <Button
            label="Abort"
            size="sm"
            variant="secondary"
            isLoading={busy === row.jobId} isDisabled={!isAdmin} tooltip={isAdmin ? undefined : ADMIN_REQUIRED}
            onClick={async () => {
              setBusy(row.jobId)
              try {
                await guard(() => abortGpuJob(row.jobId))
                await router.invalidate()
              } finally {
                setBusy(null)
              }
            }}
          />
        ) : null,
    },
  ]
  return (
    <Panel title="GPU queue">
      <Text type="supporting">Only queued jobs can be aborted; a generation already running finishes.</Text>
      {error && <Banner status="error" title="Not aborted" description={error} isDismissable onDismiss={clearError} />}
      <Table data={jobs} columns={columns} idKey="jobId" density="compact" />
    </Panel>
  )
}

function AnalysisResultsPage() {
  const isAdmin = useIsAdmin()
  const data = Route.useLoaderData()
  const { tab = 'workbench' } = Route.useSearch()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [queued, setQueued] = useState<AnalysisResult | null>(null)
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const rows = data.results.filter((r) => r.analyzer === tab && (!needle || JSON.stringify(r).toLowerCase().includes(needle)))
  const myRuns = data.results.filter((r) => r.analyzer === 'workbench' && r.owner).slice(0, 5)

  return (
    <RecordList
      title="Analysis results"
      description="Launch an analysis run against a captured payload, then follow every analyzer's verdict: static analysis, YARA, sandbox detonations, and Ghidra decompilations."
      actions={
        <HStack gap={3} wrap="wrap" vAlign="center">
          <Link href="/revdeck">RevDeck</Link>
          <Link href="/cape">CAPE</Link>
          <Link href="/github-analysis">GitHub analysis</Link>
          <Link href="/sandbox/vnc">Sandbox live view</Link>
          <Button label="New analysis run" size="sm" isDisabled={!isAdmin} tooltip={isAdmin ? undefined : ADMIN_REQUIRED} onClick={() => setCreating(true)} />
          <AnalysisRunDialog
            isOpen={creating}
            onOpenChange={setCreating}
            onQueued={(run) => {
              setQueued(run)
              void router.invalidate()
            }}
          />
        </HStack>
      }
      summary={
        tab === 'workbench' ? (
          <VStack gap={4}>
            {queued && <Banner status="success" title={`Run ${queued.id} queued`} description={`${queued.recipe ?? ''} on ${queued.file}…`} isDismissable onDismiss={() => setQueued(null)} />}
            <Grid columns={{ minWidth: 380, repeat: 'fit' }} gap={4}>
              <Panel title="My recent runs">
                <Table data={myRuns} columns={COLUMNS.workbench} idKey="id" density="compact" />
              </Panel>
              <Panel title="Approved local-model health">
                <Text type="supporting">Advisory: each approved model's latest retrain outcome.</Text>
                <Table
                  data={data.modelHealth}
                  columns={[
                    { key: 'model', header: 'Model', width: proportional(1), renderCell: (row) => <Text type="code">{row.model}</Text> },
                    { key: 'accepted', header: 'Last retrain', width: pixel(112), renderCell: (row) => <Token size="sm" color={row.accepted ? 'green' : 'orange'} label={row.accepted ? 'accepted' : 'rejected'} /> },
                    { key: 'timestamp', header: 'When', width: pixel(96), renderCell: (row) => <Text type="supporting">{formatTime(row.timestamp)}</Text> },
                  ]}
                  idKey="model"
                  density="compact"
                />
              </Panel>
            </Grid>
          </VStack>
        ) : tab === 'ghidra' ? (
          <GpuQueue jobs={data.gpuQueue} />
        ) : undefined
      }
      toolbar={
        <TextInput
          label="Filter results"
          isLabelHidden
          size="sm"
          width={320}
          placeholder={`Filter ${TABS.find((t) => t.id === tab)?.label ?? ''} results`}
          value={query}
          onChange={setQuery}
        />
      }
      rows={rows}
      columns={COLUMNS[tab]}
      getHref={resultHref}
      getId={(row) => row.id}
      emptyState={{ title: 'No results from this analyzer yet', description: 'Launch a New analysis run to produce some.' }}
    />
  )
}
