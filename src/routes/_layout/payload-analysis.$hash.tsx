import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { useViewTabs } from '#/components/ViewTabs'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Panel, StatTile } from '#/components/DashboardBlocks'
import { NotFound } from '#/components/NotFound'
import { PageFrame } from '#/components/PageFrame'
import { getPayloadAnalysis, queuePayloadAction } from '#/data/queries'
import type { PayloadAction } from '#/data/queries'
import type { Ioc, PayloadAnalysis } from '#/data/types'
import { formatDateTime } from '#/lib/format'

type PayloadTab = 'identity' | 'findings' | 'content'

export const Route = createFileRoute('/_layout/payload-analysis/$hash')({
  validateSearch: (search: Record<string, unknown>): { tab?: PayloadTab } => ({
    tab: search.tab === 'findings' || search.tab === 'content' ? search.tab : undefined,
  }),
  loader: async ({ params }) => {
    const analysis = await getPayloadAnalysis(params.hash)
    if (!analysis) throw notFound()
    return analysis
  },
  notFoundComponent: () => <NotFound title="Payload analysis" description="No captured payload has this hash." />,
  component: PayloadAnalysisPage,
})

const VERDICT_COLOR = { malicious: 'red', suspicious: 'orange', clean: 'green' } as const

const iocColumns: TableColumn<Ioc>[] = [
  { key: 'kind', header: 'Kind', width: pixel(88), renderCell: (row) => <Token size="sm" label={row.kind} /> },
  {
    key: 'value',
    header: 'Indicator',
    width: proportional(1),
    renderCell: (row) =>
      row.kind === 'ip' ? <Link href={`/investigate/ip/${row.value}`}>{row.value}</Link> : <Text type="code">{row.value}</Text>,
  },
]

function OperatorActions({ a }: { a: PayloadAnalysis }) {
  const [busy, setBusy] = useState<PayloadAction | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const run = async (action: PayloadAction) => {
    setBusy(action)
    try {
      setDone(await queuePayloadAction(a.payload.hash, action))
    } finally {
      setBusy(null)
    }
  }
  return (
    <Panel title="Operator actions">
      <Text color="secondary">Queue more analysis of this sample. Nothing runs on this host; every job goes to an isolated worker.</Text>
      <HStack gap={2} wrap="wrap">
        <Button label="Detonate in sandbox" variant="secondary" isDisabled={!a.payload.dynamic} isLoading={busy === 'sandbox'} onClick={() => run('sandbox')} />
        <Button label="Decompile with Ghidra" variant="secondary" isDisabled={a.payload.kind === 'shell script'} isLoading={busy === 'ghidra'} onClick={() => run('ghidra')} />
        <Button label="Generate PDF report" variant="secondary" isLoading={busy === 'pdf'} onClick={() => run('pdf')} />
        <Button label="Publish to GitHub…" variant="secondary" isLoading={busy === 'github'} onClick={() => setConfirmPublish(true)} />
      </HStack>
      {!a.payload.dynamic && <Text type="supporting">This sample has no dynamic route (static-only), so it cannot be detonated.</Text>}
      {done && <Banner status="success" title={done} description="Mock: nothing was actually queued." isDismissable onDismiss={() => setDone(null)} />}
      <AlertDialog
        isOpen={confirmPublish}
        onOpenChange={setConfirmPublish}
        title="Publish to Xore/honeypot?"
        description="The sample and its analysis become public in the GitHub repository and are submitted to third-party scanners. This cannot be undone from the dashboard."
        actionLabel="Publish"
        onAction={async () => {
          setConfirmPublish(false)
          await run('github')
        }}
      />
    </Panel>
  )
}

function PayloadAnalysisPage() {
  const a = Route.useLoaderData()
  const { hash } = Route.useParams()
  const { tab = 'identity' } = Route.useSearch()
  const navigate = Route.useNavigate()
  useViewTabs({
    label: 'Payload analysis views',
    tabs: [{ id: 'identity', label: 'Identity' }, { id: 'findings', label: 'Findings' }, { id: 'content', label: 'Content' }],
    value: tab,
    onChange: (value) => void navigate({ search: { tab: value === 'identity' ? undefined : (value as PayloadTab) } }),
  })
  const p = a.payload

  return (
    <PageFrame
      title="Payload analysis"
      description="Bounded static analysis. The sample is never executed here."
      actions={
        <HStack gap={1.5} wrap="wrap">
          {p.sources.map((s) => (
            <Token key={s} size="sm" label={s} />
          ))}
          {p.verdict && <Token size="sm" color={VERDICT_COLOR[p.verdict.label]} label={p.verdict.label} />}
          {p.verdict?.family && <Token size="sm" color="purple" label={p.verdict.family} />}
        </HStack>
      }
    >
      <VStack gap={5}>
        <Text type="code">{hash}</Text>
        <Grid columns={{ minWidth: 180, repeat: 'fit' }} gap={4}>
          <StatTile label="Static risk" value={a.staticRisk} caption="out of 100" />
          <StatTile label="Packing likelihood" value={a.packingLikelihood} caption="percent" />
          <StatTile label="Extracted IOCs" value={a.iocs.length} />
          <StatTile label="YARA matches" value={a.yara.length} />
        </Grid>
        <Panel title="Other analyses of this sample">
          <HStack gap={4} wrap="wrap">
            {a.sandbox ? <Link href={`/sandbox/${a.sandbox.job}`}>{`Sandbox run: ${a.sandbox.verdict}, risk ${a.sandbox.risk}`}</Link> : <Text type="supporting">No sandbox run</Text>}
            {a.ghidra ? <Link href={`/ghidra/${hash}`}>Ghidra decompilation</Link> : <Text type="supporting">No Ghidra result</Text>}
            {a.github ? <Link href={`/github-analysis/${hash}`}>{`GitHub scan: ${a.github.detections}/${a.github.engines}`}</Link> : <Text type="supporting">Not published</Text>}
            <Link href={`/payload-workbench/results?tab=workbench&hash=${hash}`}>Start a workbench run</Link>
          </HStack>
        </Panel>
        <OperatorActions a={a} />
        {tab === 'identity' && (
          <Panel title="What this file is">
            <MetadataList label={{ position: 'start', width: 128 }}>
              <MetadataListItem label="File type">{a.fileType}</MetadataListItem>
              <MetadataListItem label="Platform">{p.platform}</MetadataListItem>
              <MetadataListItem label="MIME">{p.mime}</MetadataListItem>
              <MetadataListItem label="Size">{`${p.sizeBytes.toLocaleString('en-US')} bytes`}</MetadataListItem>
              <MetadataListItem label="Copies captured">{String(p.copies)}</MetadataListItem>
              <MetadataListItem label="First captured">{formatDateTime(p.capturedAt)}</MetadataListItem>
              {a.entryPoint && <MetadataListItem label="Entry point">{a.entryPoint}</MetadataListItem>}
              {a.classification && <MetadataListItem label="Script class">{a.classification}</MetadataListItem>}
              <MetadataListItem label="Analysis path">{p.dynamic ? 'static + dynamic (sandbox route available)' : 'static only'}</MetadataListItem>
              <MetadataListItem label="MD5">
                <Text type="code">{a.hashes.md5}</Text>
              </MetadataListItem>
              <MetadataListItem label="SHA-1">
                <Text type="code">{a.hashes.sha1}</Text>
              </MetadataListItem>
              <MetadataListItem label="ssdeep">
                <Text type="code">{a.hashes.ssdeep}</Text>
              </MetadataListItem>
            </MetadataList>
          </Panel>
        )}
        {tab === 'findings' && (
          <Grid columns={{ minWidth: 340, repeat: 'fit' }} gap={4}>
            <Panel title="YARA rule matches">
              {a.yara.length ? (
                <HStack gap={1} wrap="wrap">
                  {a.yara.map((rule) => (
                    <Token key={rule} size="sm" color="orange" label={rule} />
                  ))}
                </HStack>
              ) : (
                <Text type="supporting">No rule matched.</Text>
              )}
            </Panel>
            <Panel title="Extracted indicators">
              <Table data={a.iocs} columns={iocColumns} idKey="id" density="compact" />
            </Panel>
          </Grid>
        )}
        {tab === 'content' && (
          <VStack gap={4}>
            <CodeBlock code={a.preview} title="Hex / ASCII, first 128 bytes" hasCopyButton={false} />
            <Grid columns={{ minWidth: 340, repeat: 'fit' }} gap={4}>
              <Panel title="Extracted strings">
                <VStack gap={1}>
                  {a.strings.map((s) => (
                    <Text key={s} type="code">
                      {s}
                    </Text>
                  ))}
                </VStack>
              </Panel>
              <Panel title="Decoded candidates">
                <VStack gap={2}>
                  {a.decoded.map((d) => (
                    <VStack key={d.value} gap={0.5}>
                      <Token size="sm" label={d.encoding} />
                      <Text type="code">{d.value}</Text>
                    </VStack>
                  ))}
                </VStack>
              </Panel>
              {a.sections.length > 0 && (
                <Panel title="Sections">
                  <Table
                    data={a.sections.map((s) => ({ ...s, id: s.name }))}
                    columns={[
                      { key: 'name', header: 'Section', width: proportional(1), renderCell: (row) => <Text type="code">{row.name}</Text> },
                      { key: 'size', header: 'Size', width: pixel(96), align: 'end', renderCell: (row) => row.size.toLocaleString('en-US') },
                      { key: 'entropy', header: 'Entropy', width: pixel(88), align: 'end' },
                    ]}
                    idKey="id"
                    density="compact"
                  />
                </Panel>
              )}
            </Grid>
          </VStack>
        )}
      </VStack>
    </PageFrame>
  )
}
