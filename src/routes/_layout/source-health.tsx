import { Grid } from '@astryxdesign/core/Grid'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Panel, StatTile } from '#/components/DashboardBlocks'
import { FeedStateLabel } from '#/components/FeedState'
import { PageFrame } from '#/components/PageFrame'
import { getSourceHealth } from '#/data/queries'
import type { SensorFeed, SourceHealth } from '#/data/types'
import { formatDateTime, formatNumber } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'
import { useCallback, useEffect } from 'react'
import { HEALTH_CHANGED } from '#/data/mock/incidents'
import { useLiveInterval } from '#/lib/live'

export const Route = createFileRoute('/_layout/source-health')({
  loader: () => getSourceHealth(),
  component: SourceHealthPage,
})

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86_400)
  const h = Math.floor((seconds % 86_400) / 3_600)
  const m = Math.floor((seconds % 3_600) / 60)
  const s = seconds % 60
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, !d && !h && `${s}s`].filter(Boolean).join(' ')
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`
}

const CLUSTER = { green: 'success', yellow: 'warning', red: 'error' } as const satisfies Record<SourceHealth['clusterStatus'], string>
const PIPELINE = { running: 'success', degraded: 'warning', stopped: 'error' } as const satisfies Record<SourceHealth['pipeline']['state'], string>

const feedColumns: TableColumn<SensorFeed>[] = [
  { key: 'sensor', header: 'Sensor', width: proportional(2), renderCell: (row) => <EntityLink kind="sensor" id={row.sensor} /> },
  { key: 'state', header: 'State', width: pixel(128), renderCell: (row) => <FeedStateLabel state={row.state} /> },
  { key: 'documents', header: 'Documents', width: pixel(112), align: 'end', renderCell: (row) => formatNumber(row.documents) },
  { key: 'lastSeen', header: 'Last event', width: pixel(200), renderCell: (row) => formatDateTime(row.lastSeen) },
]

function SourceHealthPage() {
  const health = Route.useLoaderData()
  const router = useRouter()
  // Health moves in minutes: re-read it on the live interval, and at once
  // when a simulated incident changes it.
  const refresh = useCallback(() => void router.invalidate(), [router])
  useLiveInterval(refresh, 30_000)
  useEffect(() => {
    window.addEventListener(HEALTH_CHANGED, refresh)
    return () => window.removeEventListener(HEALTH_CHANGED, refresh)
  }, [refresh])
  const { ingest, yara, runtime, pipeline } = health
  const unhealthy = health.feeds.filter((f) => f.state !== 'fresh').length

  return (
    <PageFrame
      title="Source & pipeline health"
      description="Is every sensor still feeding the pipeline? Freshness per source, ordered by most recent event."
      actions={<Link href="/dead-letters">Dead letters</Link>}
    >
      <VStack gap={6}>
        <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={4}>
          <StatTile label="Configured feeds" value={health.feeds.length} caption={unhealthy ? `${unhealthy} not fresh` : 'all fresh'} />
          <StatTile label="Indexed documents" value={health.indexedDocuments} href="/history" />
          <Panel title="Filebeat">
            <HStack gap={2} vAlign="center">
              <StatusDot variant={PIPELINE[pipeline.state]} label={pipeline.state} />
              <Text weight="semibold">{pipeline.state}</Text>
            </HStack>
          </Panel>
          <StatTile label="Dead letters, 24h" value={health.deadLetters} href="/dead-letters" />
        </Grid>

        <VStack gap={3}>
          <Heading level={2}>Ingestion pipeline</Heading>
          <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
            <Panel title="Ingestion freshness">
              <MetadataList label={{ position: 'start', width: 152 }}>
                <MetadataListItem label="State">
                  <FeedStateLabel state={ingest.state} />
                </MetadataListItem>
                <MetadataListItem label="Latest indexed event">{formatDateTime(ingest.lastIngest)}</MetadataListItem>
                <MetadataListItem label="Ingestion age">{formatDuration(ingest.ageSeconds)}</MetadataListItem>
                <MetadataListItem label="Dead letters, 24h">
                  <Link href="/dead-letters">{formatNumber(ingest.recentDeadLetters)}</Link>
                </MetadataListItem>
              </MetadataList>
              <Text type="supporting">Delayed means the newest event is over two minutes old; stale means over fifteen.</Text>
            </Panel>
            <Panel title="Pipeline status">
              <MetadataList label={{ position: 'start', width: 152 }}>
                <MetadataListItem label="Filebeat">{pipeline.state}</MetadataListItem>
                <MetadataListItem label="Acknowledged">{formatNumber(pipeline.acked)}</MetadataListItem>
                <MetadataListItem label="Failed / dropped / active">
                  {`${formatNumber(pipeline.failed)} / ${formatNumber(pipeline.dropped)} / ${formatNumber(pipeline.active)}`}
                </MetadataListItem>
                <MetadataListItem label="Decode failures">{formatNumber(pipeline.decodeFailures)}</MetadataListItem>
              </MetadataList>
            </Panel>
          </Grid>
        </VStack>

        <VStack gap={3}>
          <Heading level={2}>Platform services</Heading>
          <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
            <Panel title="YARA scanner">
              <MetadataList label={{ position: 'start', width: 136 }}>
                <MetadataListItem label="Enabled">{yara.enabled ? 'yes' : 'no'}</MetadataListItem>
                <MetadataListItem label="Last scan">{formatDateTime(yara.lastScan)}</MetadataListItem>
                <MetadataListItem label="Rules SHA-256">
                  <Text type="code">{`${yara.rulesSha256.slice(0, 16)}…`}</Text>
                </MetadataListItem>
                <MetadataListItem label="Samples scanned">{formatNumber(yara.samples)}</MetadataListItem>
                <MetadataListItem label="Samples matched">{formatNumber(yara.matched)}</MetadataListItem>
                <MetadataListItem label="Errors">{formatNumber(yara.errors)}</MetadataListItem>
              </MetadataList>
            </Panel>
            <Panel title="Backend runtime">
              <MetadataList label={{ position: 'start', width: 136 }}>
                <MetadataListItem label="Uptime">{formatDuration(runtime.uptimeSeconds)}</MetadataListItem>
                <MetadataListItem label="Resident memory">{formatBytes(runtime.rssBytes)}</MetadataListItem>
                <MetadataListItem label="Virtual memory">{formatBytes(runtime.vmBytes)}</MetadataListItem>
                <MetadataListItem label="Elasticsearch">
                  <HStack gap={1.5} vAlign="center">
                    <StatusDot variant={CLUSTER[health.clusterStatus]} label={health.clusterStatus} />
                    <Text>{health.clusterStatus}</Text>
                  </HStack>
                </MetadataListItem>
              </MetadataList>
            </Panel>
          </Grid>
        </VStack>

        <Panel title="Per-sensor feeds">
          <Table data={health.feeds} columns={feedColumns} idKey="sensor" density="compact" />
        </Panel>
      </VStack>
    </PageFrame>
  )
}
