import { useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { Tab, TabList } from '@astryxdesign/core/TabList'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { RecordList } from '#/components/RecordList'
import { abortGpuJob, getAnalysisResults, startWorkbenchRun } from '#/data/queries'
import type { AnalysisResult, AnalysisResultsData, AnalyzerTab, GpuJob } from '#/data/types'
import { formatDateTime, formatTime } from '#/lib/format'

const TABS: Array<{ id: AnalyzerTab; label: string }> = [
  { id: 'workbench', label: 'Workbench' },
  { id: 'static', label: 'Static analysis' },
  { id: 'yara', label: 'YARA' },
  { id: 'sandbox', label: 'Sandbox' },
  { id: 'ghidra', label: 'Ghidra' },
]

export const Route = createFileRoute('/_layout/payload-workbench/results')({
  validateSearch: (search: Record<string, unknown>): { tab?: AnalyzerTab; hash?: string } => ({
    tab: TABS.some((t) => t.id === search.tab) ? (search.tab as AnalyzerTab) : undefined,
    hash: typeof search.hash === 'string' && search.hash ? search.hash : undefined,
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

const DETAIL_ROUTE: Partial<Record<AnalyzerTab, string>> = { sandbox: '/sandbox/', ghidra: '/ghidra/' }

function ResultInspector({ result }: { result: AnalysisResult }) {
  const hash = encodeURIComponent(result.hash)
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <Token size="sm" label={result.analyzer} />
        {result.state && <Token size="sm" color={STATE_COLOR[result.state]} label={result.state} />}
        {result.risk !== undefined && <Token size="sm" color={result.risk > 70 ? 'red' : 'orange'} label={`risk ${result.risk}`} />}
      </HStack>
      <Text>{result.summary}</Text>
      <MetadataList label={{ position: 'start', width: 88 }}>
        <MetadataListItem label="Time">{formatDateTime(result.at)}</MetadataListItem>
        <MetadataListItem label="File">
          <Text type="code">{result.file}</Text>
        </MetadataListItem>
        <MetadataListItem label="SHA-256">
          <Link href={`/payload-analysis/${hash}`}>
            <Text type="code">{`${result.hash.slice(0, 24)}…`}</Text>
          </Link>
        </MetadataListItem>
        {result.owner && <MetadataListItem label="Owner">{result.owner}</MetadataListItem>}
      </MetadataList>
      {DETAIL_ROUTE[result.analyzer] && (
        <Link href={`${DETAIL_ROUTE[result.analyzer]}${hash}`} isStandalone>
          Open full {result.analyzer} result
        </Link>
      )}
      <VStack gap={2}>
        <Heading level={3}>Result document</Heading>
        <CodeBlock code={JSON.stringify(result.detail, null, 2)} language="json" maxHeight={320} />
      </VStack>
    </VStack>
  )
}

function WorkbenchBuilder({ analyzers, initialHash }: { analyzers: AnalysisResultsData['analyzers']; initialHash: string }) {
  const router = useRouter()
  const [hash, setHash] = useState(initialHash)
  const [selected, setSelected] = useState<string[]>(['static', 'yara'])
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string } | null>(null)

  return (
    <Panel title="Start a new analysis">
      <HStack gap={2} vAlign="end">
        <StackItem size="fill">
          <TextInput label="Payload SHA-256" placeholder="Paste a captured payload hash" value={hash} onChange={setHash} />
        </StackItem>
      </HStack>
      <CheckboxList label="Analyzers" value={selected} onChange={setSelected}>
        {analyzers.map((a) => (
          <CheckboxListItem
            key={a.id}
            value={a.id}
            label={a.label}
            description={a.description}
            endContent={a.gpu ? <Token size="sm" color="purple" label="GPU queue" /> : undefined}
          />
        ))}
      </CheckboxList>
      {outcome && <Banner status={outcome.ok ? 'success' : 'error'} title={outcome.text} />}
      <HStack hAlign="end">
        <Button
          label="Start run"
          isLoading={busy}
          isDisabled={!hash.trim() || selected.length === 0}
          onClick={async () => {
            setBusy(true)
            try {
              const run = await startWorkbenchRun(hash.trim(), selected)
              setOutcome(run ? { ok: true, text: `Run ${run.id} queued (${selected.join(', ')}).` } : { ok: false, text: 'No captured payload has that hash.' })
              if (run) await router.invalidate()
            } finally {
              setBusy(false)
            }
          }}
        />
      </HStack>
    </Panel>
  )
}

function GpuQueue({ jobs }: { jobs: GpuJob[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
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
            isLoading={busy === row.jobId}
            onClick={async () => {
              setBusy(row.jobId)
              try {
                await abortGpuJob(row.jobId)
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
      <Table data={jobs} columns={columns} idKey="jobId" density="compact" />
    </Panel>
  )
}

function AnalysisResultsPage() {
  const data = Route.useLoaderData()
  const { tab = 'workbench', hash } = Route.useSearch()
  const navigate = Route.useNavigate()
  const rows = data.results.filter((r) => r.analyzer === tab)
  const count = (id: AnalyzerTab) => data.results.filter((r) => r.analyzer === id).length

  return (
    <RecordList
      title="Analysis results"
      description="Submit a workbench run against a captured payload, then follow every analyzer's verdict: static analysis, YARA, sandbox detonations, and Ghidra decompilations."
      actions={
        <HStack gap={3} wrap="wrap">
          <Link href="/revdeck">RevDeck</Link>
          <Link href="/cape">CAPE</Link>
          <Link href="/github-analysis">GitHub analysis</Link>
          <Link href="/sandbox/vnc">Sandbox live view</Link>
        </HStack>
      }
      summary={
        tab === 'workbench' ? (
          <WorkbenchBuilder key={hash ?? ''} analyzers={data.analyzers} initialHash={hash ?? ''} />
        ) : tab === 'ghidra' ? (
          <GpuQueue jobs={data.gpuQueue} />
        ) : undefined
      }
      toolbar={
        <TabList value={tab} onChange={(value) => void navigate({ search: { tab: value as AnalyzerTab } })} hasDivider>
          {TABS.map((t) => (
            <Tab key={t.id} value={t.id} label={`${t.label} (${count(t.id)})`} />
          ))}
        </TabList>
      }
      rows={rows}
      columns={COLUMNS[tab]}
      getId={(row) => row.id}
      inspectorTitle="Result"
      renderInspector={(row) => <ResultInspector result={row} />}
      emptyState={{ title: 'No results from this analyzer yet', description: 'Start a workbench run to produce some.' }}
    />
  )
}
