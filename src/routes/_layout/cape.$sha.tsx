import { Banner } from '@astryxdesign/core/Banner'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Panel, StatTile } from '#/components/DashboardBlocks'
import { NotFound } from '#/components/NotFound'
import { PageFrame } from '#/components/PageFrame'
import { getCapeRun } from '#/data/queries'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/cape/$sha')({
  loader: async ({ params }) => {
    const run = await getCapeRun(params.sha)
    if (!run) throw notFound()
    return run
  },
  notFoundComponent: () => <NotFound title="CAPE result" description="No CAPE result found for this hash." />,
  component: CapePage,
})

function CapePage() {
  const run = Route.useLoaderData()
  return (
    <PageFrame title="CAPE result" description="Detonation in an isolated, debugger-instrumented Windows guest, built to defeat debugger-class time evasion.">
      <VStack gap={5}>
        <HStack gap={3} wrap="wrap">
          <Link href={`/payload-analysis/${run.sha}`}><Text type="code">{`${run.sha.slice(0, 24)}…`}</Text></Link>
          <Text type="supporting">{formatDateTime(run.at)}</Text>
        </HStack>
        {run.status === 'failed_analysis' ? (
          <Banner status="error" title="This run did not complete" description={run.log} />
        ) : (
          <>
            <Grid columns={{ minWidth: 170, repeat: 'fit' }} gap={4}>
              <StatTile label="Malscore" value={run.malscore} caption="out of 10" />
              <StatTile label="Signatures" value={run.signatures.length} />
              <StatTile label="Processes traced" value={run.processes.length} />
              <StatTile label="Dumps" value={run.dumps.length} />
            </Grid>
            <Panel title="Signatures">
              <Table
                data={run.signatures.map((s) => ({ ...s, id: s.name }))}
                columns={[
                  { key: 'severity', header: 'Severity', width: pixel(88), renderCell: (row) => <Token size="sm" color={row.severity >= 3 ? 'red' : 'orange'} label={String(row.severity)} /> },
                  { key: 'name', header: 'Signature', width: pixel(200), renderCell: (row) => <Text type="code">{row.name}</Text> },
                  { key: 'description', header: 'Description', width: proportional(2) },
                ]}
                idKey="id"
                density="compact"
              />
            </Panel>
            <Grid columns={{ minWidth: 340, repeat: 'fit' }} gap={4}>
              <Panel title="Process activity">
                <VStack gap={2}>
                  {run.processes.map((p) => (
                    <VStack key={p.pid} gap={0.5}>
                      <Text weight="semibold">{`${p.name} (pid ${p.pid})`}</Text>
                      <Text type="code">{p.commandLine}</Text>
                    </VStack>
                  ))}
                </VStack>
              </Panel>
              <Panel title="Extracted configuration">
                <MetadataList label={{ position: 'start', width: 80 }}>
                  {Object.entries(run.config).map(([k, v]) => (
                    <MetadataListItem key={k} label={k}>
                      <Text type="code">{v}</Text>
                    </MetadataListItem>
                  ))}
                </MetadataList>
                {run.dumps.map((d) => <Text key={d} type="code">{d}</Text>)}
              </Panel>
            </Grid>
          </>
        )}
        <Panel title="Analyzer log">
          <CodeBlock code={run.log} hasCopyButton={false} />
        </Panel>
      </VStack>
    </PageFrame>
  )
}
