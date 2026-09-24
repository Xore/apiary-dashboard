import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { OperatorActions } from '#/components/analyzers/PayloadBlocks'
import { Panel, StatTile } from '#/components/DashboardBlocks'
import { formatDateTime } from '#/lib/format'

const parent = getRouteApi('/_layout/payloads/$hash')

export const Route = createFileRoute('/_layout/payloads/$hash/')({ component: PayloadOverview })

function PayloadOverview() {
  const { analysis: a, cape, revdeck, github } = parent.useLoaderData()
  const p = a.payload
  const base = `/payloads/${p.hash}`
  const analyses: Array<[string, string, string | null]> = [
    ['Sandbox', 'sandbox', a.sandbox ? `${a.sandbox.verdict}, risk ${a.sandbox.risk}` : null],
    ['Ghidra', 'ghidra', a.ghidra ? 'decompiled' : null],
    ['CAPE', 'cape', cape ? `malscore ${cape.malscore}` : null],
    ['RevDeck', 'revdeck', revdeck ? revdeck.verdict : null],
    ['GitHub', 'github', github ? `${github.detections}/${github.engines} engines` : null],
  ]
  return (
    <VStack gap={4}>
      <Text type="code">{p.hash}</Text>
      <Grid columns={{ minWidth: 180, repeat: 'fit' }} gap={4}>
        <StatTile label="Static risk" value={a.staticRisk} caption="out of 100" href={`${base}/static`} />
        <StatTile label="Packing likelihood" value={a.packingLikelihood} caption="percent" href={`${base}/static`} />
        <StatTile label="Extracted IOCs" value={a.iocs.length} href={`${base}/indicators`} />
        <StatTile label="YARA matches" value={a.yara.length} href={`${base}/indicators`} />
      </Grid>
      <Panel title="Analyses of this sample">
        <HStack gap={4} wrap="wrap">
          {analyses.map(([label, tab, result]) =>
            result ? (
              <Link key={tab} href={`${base}/${tab}`}>{`${label}: ${result}`}</Link>
            ) : (
              <Text key={tab} type="supporting">{`${label}: not run`}</Text>
            ),
          )}
          <Link href={`/payload-workbench/results?tab=workbench&hash=${p.hash}`}>Start a workbench run</Link>
        </HStack>
      </Panel>
      <Grid columns={{ minWidth: 340, repeat: 'fit' }} gap={4}>
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
        <OperatorActions a={a} />
      </Grid>
    </VStack>
  )
}
