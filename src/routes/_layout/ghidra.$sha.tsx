import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Tab, TabList } from '@astryxdesign/core/TabList'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { MiniTable, Panel, StatTile } from '#/components/DashboardBlocks'
import { NotFound } from '#/components/NotFound'
import { PageFrame } from '#/components/PageFrame'
import { getGhidraAnalysis, queuePayloadAction } from '#/data/queries'
import type { GhidraFunction } from '#/data/types'
import { formatDateTime } from '#/lib/format'

const TABS = ['overview', 'code', 'data', 'deepdive'] as const
type GhidraTab = (typeof TABS)[number]

export const Route = createFileRoute('/_layout/ghidra/$sha')({
  validateSearch: (search: Record<string, unknown>): { tab?: GhidraTab; fn?: string } => ({
    tab: TABS.includes(search.tab as GhidraTab) && search.tab !== 'overview' ? (search.tab as GhidraTab) : undefined,
    fn: typeof search.fn === 'string' && search.fn ? search.fn : undefined,
  }),
  loader: async ({ params }) => {
    const analysis = await getGhidraAnalysis(params.sha)
    if (!analysis) throw notFound()
    return analysis
  },
  notFoundComponent: () => <NotFound title="Ghidra result" description="No Ghidra analysis found for this hash." />,
  component: GhidraPage,
})

const fnColumns: TableColumn<GhidraFunction>[] = [
  { key: 'name', header: 'Function', width: proportional(2), renderCell: (row) => <Text type="code">{row.name}</Text> },
  { key: 'address', header: 'Address', width: pixel(104), renderCell: (row) => <Text type="code">{row.address}</Text> },
  { key: 'size', header: 'Size', width: pixel(72), align: 'end' },
  { key: 'calls', header: 'Calls', width: pixel(64), align: 'end' },
]

function GhidraPage() {
  const g = Route.useLoaderData()
  const { sha } = Route.useParams()
  const { tab = 'overview', fn } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [queued, setQueued] = useState<string | null>(null)
  const selected = g.functions.find((f) => f.name === fn) ?? g.functions[0]

  return (
    <PageFrame
      title="Ghidra result"
      description="Headless decompilation of one captured payload. Nothing here is executed."
      actions={<Button label="Re-analyze" size="sm" variant="secondary" onClick={() => setConfirmOpen(true)} />}
    >
      <VStack gap={5}>
        <HStack gap={3} wrap="wrap" vAlign="center">
          <Link href={`/payload-analysis/${sha}`}>
            <Text type="code">{`${sha.slice(0, 24)}…`}</Text>
          </Link>
          <Text type="supporting">
            {g.arch} · analyzed {formatDateTime(g.at)}
          </Text>
          <Link href={`/revdeck/${sha}`}>RevDeck walkthrough</Link>
        </HStack>
        {queued && <Banner status="success" title={queued} description="Mock: nothing was actually queued." isDismissable onDismiss={() => setQueued(null)} />}
        <Grid columns={{ minWidth: 170, repeat: 'fit' }} gap={4}>
          <StatTile label="Functions" value={g.functions.length} />
          <StatTile label="Imports" value={g.imports.length} />
          <StatTile label="Strings" value={g.strings.length} />
          <StatTile label="Crypto constants" value={g.cryptoConstants.length} />
        </Grid>
        <TabList value={tab} onChange={(value) => void navigate({ search: (prev) => ({ ...prev, tab: value === 'overview' ? undefined : (value as GhidraTab) }) })} hasDivider>
          <Tab value="overview" label="Overview" />
          <Tab value="code" label="Code" />
          <Tab value="data" label="Data" />
          <Tab value="deepdive" label="Deep dive" />
        </TabList>
        {tab === 'overview' && (
          <VStack gap={4}>
            <Panel title="Automated triage" action={<Token size="sm" label="AI-generated" />}>
              <Text>{g.aiTriage.summary}</Text>
              <Text type="supporting">
                {g.aiTriage.model} · confidence {g.aiTriage.confidence}. Unverified until a human reviews the code below.
              </Text>
            </Panel>
            <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={4}>
              <Panel title="Fuzzy hashes">
                <MetadataList label={{ position: 'start', width: 80 }}>
                  <MetadataListItem label="ssdeep">
                    <Text type="code">{g.fuzzy.ssdeep}</Text>
                  </MetadataListItem>
                  <MetadataListItem label="TLSH">
                    <Text type="code" maxLines={1}>{g.fuzzy.tlsh}</Text>
                  </MetadataListItem>
                  <MetadataListItem label="imphash">
                    <Text type="code">{g.fuzzy.imphash}</Text>
                  </MetadataListItem>
                </MetadataList>
              </Panel>
              <Panel title="Capabilities (capa)">
                <VStack gap={1.5}>
                  {g.capa.map((c) => (
                    <HStack key={c.capability} gap={2} vAlign="center">
                      <Text>{c.capability}</Text>
                      {c.attck && <Token size="sm" color="blue" label={c.attck} />}
                    </HStack>
                  ))}
                </VStack>
              </Panel>
              <Panel title="Cryptographic constants">
                {g.cryptoConstants.length ? (
                  g.cryptoConstants.map((c) => <Text key={c.address} type="code">{`${c.name} @ ${c.address}`}</Text>)
                ) : (
                  <Text type="supporting">None found.</Text>
                )}
              </Panel>
            </Grid>
          </VStack>
        )}
        {tab === 'code' && (
          <Grid columns={{ minWidth: 380, repeat: 'fit' }} gap={4}>
            <VStack gap={4}>
              <Panel title="Functions">
                <Table
                  data={g.functions}
                  columns={[
                    ...fnColumns.slice(0, 1).map((c) => ({
                      ...c,
                      renderCell: (row: GhidraFunction) => (
                        <Link href={`/ghidra/${sha}?tab=code&fn=${row.name}`}>
                          <Text type="code">{row.name}</Text>
                        </Link>
                      ),
                    })),
                    ...fnColumns.slice(1),
                  ]}
                  idKey="name"
                  density="compact"
                />
              </Panel>
              <MiniTable title="Imports" header="Symbol" rows={g.imports} isCode />
            </VStack>
            <Panel title={`Decompiled: ${selected.name}`}>
              <CodeBlock code={selected.decompiled} language="c" title={`${selected.name} @ ${selected.address}`} hasLineNumbers />
            </Panel>
          </Grid>
        )}
        {tab === 'data' && (
          <Panel title="Strings">
            <VStack gap={1}>
              {g.strings.map((s) => (
                <Text key={s} type="code">
                  {s}
                </Text>
              ))}
            </VStack>
          </Panel>
        )}
        {tab === 'deepdive' && (
          <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
            {(['decoded', 'stack', 'tight'] as const).map((kind) => (
              <Panel key={kind} title={`FLOSS ${kind} strings`}>
                <VStack gap={1}>
                  {g.floss[kind].map((s) => (
                    <Text key={s} type="code">
                      {s}
                    </Text>
                  ))}
                </VStack>
              </Panel>
            ))}
          </Grid>
        )}
      </VStack>
      <AlertDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Decompile this sample again?"
        description="Queues a fresh Ghidra run on the GPU queue. The current result stays until the new one completes."
        actionLabel="Re-analyze"
        actionVariant="primary"
        onAction={async () => {
          setConfirmOpen(false)
          setQueued(await queuePayloadAction(sha, 'ghidra'))
        }}
      />
    </PageFrame>
  )
}
