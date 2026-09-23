import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Selector } from '@astryxdesign/core/Selector'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { ProtocolTimeline } from '#/components/charts'
import { CountTable, Panel, StatTile } from '#/components/DashboardBlocks'
import { PageFrame } from '#/components/PageFrame'
import { SeverityToken } from '#/components/SeverityToken'
import { getSensorCatalog, getSensorDetail } from '#/data/queries'
import type { HoneypotEvent, SensorStatus } from '#/data/types'
import { formatClock, formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/sensors/$sensor')({
  loader: async ({ params }) => {
    const [detail, catalog] = await Promise.all([getSensorDetail(params.sensor), getSensorCatalog()])
    if (!detail) throw notFound()
    return { detail, catalog }
  },
  component: SensorPage,
})

const STATUS_VARIANT = { online: 'success', degraded: 'warning', offline: 'error' } as const satisfies Record<SensorStatus, string>

const eventColumns: TableColumn<HoneypotEvent>[] = [
  { key: 'timestamp', header: 'Time (UTC)', width: pixel(88), renderCell: (row) => <Text type="supporting">{formatClock(row.timestamp)}</Text> },
  { key: 'severity', header: 'Severity', width: pixel(96), renderCell: (row) => <SeverityToken severity={row.severity} /> },
  { key: 'srcIp', header: 'Source', width: pixel(136), renderCell: (row) => <Link href={`/investigate/ip/${row.srcIp}`}>{row.srcIp}</Link> },
  { key: 'summary', header: 'Detail', width: proportional(3), renderCell: (row) => <Text type="code">{row.summary}</Text> },
]

function SensorPage() {
  const { detail, catalog } = Route.useLoaderData()
  const navigate = useNavigate()
  const { sensor } = detail

  return (
    <PageFrame
      title={sensor.name}
      description={`${sensor.kind} · ${sensor.location} · ${sensor.protocols.map((p) => p.toUpperCase()).join(', ')}`}
      actions={
        <Selector
          label="Sensor"
          isLabelHidden
          size="sm"
          value={sensor.id}
          onChange={(value) => void navigate({ to: '/sensors/$sensor', params: { sensor: value } })}
          options={catalog.map((c) => ({ value: c.sensor, label: `${c.sensor} (${formatNumber(c.events)})` }))}
        />
      }
    >
      <VStack gap={6}>
        <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={4}>
          <StatTile label="Events, 24h" value={sensor.eventsLast24h} href={`/events?sensor=${sensor.id}`} />
          <StatTile label="Unique sources, 24h" value={detail.uniqueSources} />
          <Panel title="Status">
            <HStack gap={2} vAlign="center">
              <StatusDot variant={STATUS_VARIANT[sensor.status]} label={sensor.status} />
              <Text weight="semibold">{sensor.status}</Text>
            </HStack>
            <MetadataList label={{ position: 'start', width: 80 }}>
              <MetadataListItem label="Last seen">{formatDateTime(sensor.lastSeen)}</MetadataListItem>
            </MetadataList>
          </Panel>
        </Grid>
        <Panel title="Events by protocol" action={<Link href={`/events?sensor=${sensor.id}`}>All events</Link>}>
          <ProtocolTimeline buckets={detail.timeline} />
        </Panel>
        <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={4}>
          <Panel title="Top sources">
            <CountTable header="Source IP" rows={detail.topSources} countHeader="Events" />
          </Panel>
          <Panel title="Event types">
            <CountTable header="Type" rows={detail.byType} countHeader="Events" isCode />
          </Panel>
        </Grid>
        <Panel title="Latest events">
          <Table data={detail.recentEvents} columns={eventColumns} idKey="id" density="compact" textOverflow="truncate" />
        </Panel>
      </VStack>
    </PageFrame>
  )
}
