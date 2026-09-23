import { Divider } from '@astryxdesign/core/Divider'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute } from '@tanstack/react-router'
import { ProtocolTimeline } from '#/components/charts'
import { CountTable, Panel, StatTile } from '#/components/DashboardBlocks'
import { PageFrame } from '#/components/PageFrame'
import { SeverityToken } from '#/components/SeverityToken'
import { getOverview } from '#/data/queries'
import type { AttackSource, HoneypotEvent, Sensor, SensorStatus } from '#/data/types'
import { formatDateTime, formatNumber, formatTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/')({
  loader: () => getOverview(),
  component: OverviewPage,
})

const sourceColumns: TableColumn<AttackSource>[] = [
  {
    key: 'ip',
    header: 'Source',
    width: proportional(2),
    renderCell: (row) => <Link href={`/investigate/ip/${row.ip}`}>{row.ip}</Link>,
  },
  { key: 'country', header: 'Country', width: pixel(72) },
  { key: 'org', header: 'Network', width: proportional(2) },
  { key: 'events', header: 'Events', width: pixel(80), align: 'end', renderCell: (row) => formatNumber(row.events) },
  { key: 'riskScore', header: 'Risk', width: pixel(64), align: 'end' },
]

const eventColumns: TableColumn<HoneypotEvent>[] = [
  {
    key: 'timestamp',
    header: 'Time',
    width: pixel(96),
    renderCell: (row) => <Text type="supporting">{formatTime(row.timestamp)}</Text>,
  },
  { key: 'severity', header: 'Severity', width: pixel(96), renderCell: (row) => <SeverityToken severity={row.severity} /> },
  { key: 'protocol', header: 'Proto', width: pixel(72), renderCell: (row) => row.protocol.toUpperCase() },
  {
    key: 'srcIp',
    header: 'Source',
    width: pixel(136),
    renderCell: (row) => <Link href={`/investigate/ip/${row.srcIp}`}>{row.srcIp}</Link>,
  },
  { key: 'sensor', header: 'Sensor', width: pixel(144) },
  {
    key: 'summary',
    header: 'Summary',
    width: proportional(3),
    renderCell: (row) => <Link href={`/event/${row.id}`}>{row.summary}</Link>,
  },
]

const STATUS_VARIANT = { online: 'success', degraded: 'warning', offline: 'error' } as const satisfies Record<
  SensorStatus,
  string
>

const sensorColumns: TableColumn<Sensor>[] = [
  {
    key: 'name',
    header: 'Sensor',
    width: proportional(2),
    renderCell: (row) => (
      <HStack gap={2} vAlign="center">
        <StatusDot variant={STATUS_VARIANT[row.status]} label={row.status} tooltip={row.status} />
        <Link href={`/sensors/${row.id}`}>{row.name}</Link>
      </HStack>
    ),
  },
  { key: 'kind', header: 'Type', width: proportional(1) },
  {
    key: 'lastSeen',
    header: 'Last seen',
    width: pixel(112),
    renderCell: (row) => <Text type="supporting">{formatTime(row.lastSeen)}</Text>,
  },
  {
    key: 'eventsLast24h',
    header: 'Events',
    width: pixel(80),
    align: 'end',
    renderCell: (row) => formatNumber(row.eventsLast24h),
  },
]

function OverviewPage() {
  const data = Route.useLoaderData()

  return (
    <PageFrame title="Overview" description={`Last 24 hours · generated ${formatDateTime(data.generatedAt)}`}>
      <VStack gap={6}>
        <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={4}>
          {data.kpis.map((kpi) => (
            <StatTile key={kpi.id} {...kpi} caption="Last 24h vs. previous 24h" />
          ))}
        </Grid>

        <Panel title="Events by protocol" action={<Link href="/events">Event explorer</Link>}>
          <ProtocolTimeline buckets={data.timeline} />
        </Panel>

        <Grid columns={{ minWidth: 420, repeat: 'fit' }} gap={4}>
          <Panel title="Top attack sources" action={<Link href="/ips">All sources</Link>}>
            <Table data={data.topSources} columns={sourceColumns} idKey="ip" density="compact" hasHover />
          </Panel>
          <Panel title="Sensors" action={<Link href="/sensors">Sensor detail</Link>}>
            <Table data={data.sensors} columns={sensorColumns} idKey="id" density="compact" hasHover />
          </Panel>
        </Grid>

        <Grid columns={{ minWidth: 260, repeat: 'fit' }} gap={4}>
          <Panel title="Countries">
            <CountTable header="Country" rows={data.topCountries} />
          </Panel>
          <Panel title="Usernames tried" action={<Link href="/credentials">Credentials</Link>}>
            <CountTable header="Username" rows={data.topUsernames} isCode />
          </Panel>
          <Panel title="Passwords tried">
            <CountTable header="Password" rows={data.topPasswords} isCode />
          </Panel>
        </Grid>

        <Divider />

        <Panel title="Recent events" action={<Link href="/events">All events</Link>}>
          <Table data={data.recentEvents} columns={eventColumns} idKey="id" density="compact" textOverflow="truncate" hasHover />
        </Panel>
      </VStack>
    </PageFrame>
  )
}
