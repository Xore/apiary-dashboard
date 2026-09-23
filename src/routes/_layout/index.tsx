import { Card } from '@astryxdesign/core/Card'
import { Divider } from '@astryxdesign/core/Divider'
import { Grid } from '@astryxdesign/core/Grid'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ProtocolTimeline, Sparkline } from '#/components/charts'
import { PageFrame } from '#/components/PageFrame'
import { SeverityToken } from '#/components/SeverityToken'
import { getOverview } from '#/data/queries'
import type { AttackSource, CountRow, HoneypotEvent, Kpi, Sensor, SensorStatus } from '#/data/types'
import { formatChange, formatCompact, formatDateTime, formatNumber, formatTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/')({
  loader: () => getOverview(),
  component: OverviewPage,
})

function KpiTile({ kpi }: { kpi: Kpi }) {
  const isUp = kpi.value >= kpi.previous
  return (
    <Card>
      <VStack gap={2}>
        <Text type="label" color="secondary">
          {kpi.label}
        </Text>
        <HStack gap={2} vAlign="center">
          <Heading level={2}>{formatCompact(kpi.value)}</Heading>
          <HStack gap={1} vAlign="center">
            <Icon icon={isUp ? ArrowUpIcon : ArrowDownIcon} size="xsm" color="secondary" />
            <Text type="supporting">{formatChange(kpi.value, kpi.previous)}</Text>
          </HStack>
        </HStack>
        <Text type="supporting">Last 24h vs. previous 24h</Text>
        <Sparkline data={kpi.trend} />
      </VStack>
    </Card>
  )
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <VStack gap={4}>
        <HStack hAlign="between" vAlign="center">
          <Heading level={3}>{title}</Heading>
          {action}
        </HStack>
        {children}
      </VStack>
    </Card>
  )
}

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

const countColumns = (header: string): TableColumn<CountRow>[] => [
  { key: 'label', header, width: proportional(1), renderCell: (row) => <Text type="code">{row.label}</Text> },
  { key: 'count', header: 'Count', width: pixel(80), align: 'end', renderCell: (row) => formatNumber(row.count) },
]

function OverviewPage() {
  const data = Route.useLoaderData()

  return (
    <PageFrame title="Overview" description={`Last 24 hours · generated ${formatDateTime(data.generatedAt)}`}>
      <VStack gap={6}>
        <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={4}>
          {data.kpis.map((kpi) => (
            <KpiTile key={kpi.id} kpi={kpi} />
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
            <Table data={data.topCountries} columns={countColumns('Country')} idKey="id" density="compact" />
          </Panel>
          <Panel title="Usernames tried" action={<Link href="/credentials">Credentials</Link>}>
            <Table data={data.topUsernames} columns={countColumns('Username')} idKey="id" density="compact" />
          </Panel>
          <Panel title="Passwords tried">
            <Table data={data.topPasswords} columns={countColumns('Password')} idKey="id" density="compact" />
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
