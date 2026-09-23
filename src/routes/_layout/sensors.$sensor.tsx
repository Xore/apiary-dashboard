import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { ProtocolTimeline } from '#/components/charts'
import { CountTable, Panel } from '#/components/DashboardBlocks'
import { NotFound } from '#/components/NotFound'
import { PageFrame } from '#/components/PageFrame'
import { SeverityToken } from '#/components/SeverityToken'
import { useViewTabs } from '#/components/ViewTabs'
import { getSensorCatalog, getSensorDetail } from '#/data/queries'
import type { HoneypotEvent, SensorRequest, SensorStatus } from '#/data/types'
import { formatClock, formatDateTime, formatNumber } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'

export const Route = createFileRoute('/_layout/sensors/$sensor')({
  loader: async ({ params }) => {
    const [detail, catalog] = await Promise.all([getSensorDetail(params.sensor), getSensorCatalog()])
    if (!detail) throw notFound()
    return { detail, catalog }
  },
  notFoundComponent: () => <NotFound title="Sensor detail" description="No sensor has this name." />,
  component: SensorPage,
})

const STATUS_VARIANT = { online: 'success', degraded: 'warning', offline: 'error' } as const satisfies Record<SensorStatus, string>

const eventColumns: TableColumn<HoneypotEvent>[] = [
  { key: 'timestamp', header: 'Time (UTC)', width: pixel(96), renderCell: (row) => <Text type="supporting">{formatClock(row.timestamp)}</Text> },
  { key: 'severity', header: 'Severity', width: pixel(96), renderCell: (row) => <SeverityToken severity={row.severity} /> },
  { key: 'srcIp', header: 'Source', width: pixel(140), renderCell: (row) => <EntityLink kind="source" id={row.srcIp} /> },
  { key: 'summary', header: 'Detail', width: proportional(3), renderCell: (row) => <EntityLink kind="event" id={row.id}><Text type="code">{row.summary}</Text></EntityLink> },
]

const requestColumns: TableColumn<SensorRequest>[] = [
  { key: 'timestamp', header: 'Time (UTC)', width: pixel(96), renderCell: (row) => <Text type="supporting">{formatClock(row.timestamp)}</Text> },
  { key: 'srcIp', header: 'Source', width: pixel(140), renderCell: (row) => <EntityLink kind="source" id={row.srcIp} /> },
  { key: 'path', header: 'Request', width: proportional(3), renderCell: (row) => <Text type="code">{`${row.method} ${row.path}`}</Text> },
  { key: 'detection', header: 'Detection', width: pixel(112), renderCell: (row) => <Token size="sm" color={row.detection === 'index' ? 'gray' : 'orange'} label={row.detection} /> },
  { key: 'userAgent', header: 'User agent', width: proportional(2), renderCell: (row) => <Text type="supporting">{row.userAgent}</Text> },
]

function SensorPage() {
  const { detail, catalog } = Route.useLoaderData()
  const navigate = useNavigate()
  const { sensor } = detail

  // Every sensor is its own view; the busiest comes first.
  useViewTabs({
    label: 'Sensors',
    tabs: catalog.map((c) => ({ id: c.sensor, label: c.sensor })),
    value: sensor.id,
    onChange: (id) => void navigate({ to: '/sensors/$sensor', params: { sensor: id } }),
  })

  return (
    <PageFrame
      title={sensor.name}
      description={`${sensor.kind} · ${sensor.location} · ${sensor.protocols.map((p) => p.toUpperCase()).join(', ')}`}
      actions={
        <HStack gap={2} vAlign="center" wrap="wrap">
          <StatusDot variant={STATUS_VARIANT[sensor.status]} label={sensor.status} />
          <Text>{sensor.status}</Text>
          <Token size="sm" label={`${formatNumber(sensor.eventsLast24h)} events / 24h`} />
          <Token size="sm" label={`${formatNumber(detail.uniqueSources)} unique sources`} />
          <Token size="sm" label={`last ${formatDateTime(sensor.lastSeen)}`} />
        </HStack>
      }
    >
      <VStack gap={5}>
        <Panel title="What this sensor did">
          <Text color="secondary">The quantities this sensor exists to produce, not an event count, which says the same thing about every sensor.</Text>
          <Grid columns={{ minWidth: 180, repeat: 'fit' }} gap={3}>
            {detail.measures.map((m) => (
              <Card key={m.label} variant="muted">
                <VStack gap={1}>
                  <Heading level={3}>{formatNumber(m.value)}</Heading>
                  <Text type="label" color="secondary">{m.label}</Text>
                  <Text type="supporting">most in one event: {m.peak}</Text>
                </VStack>
              </Card>
            ))}
          </Grid>
        </Panel>

        <Panel title="Activity" action={<Link href={`/events?sensor=${sensor.id}`}>All events</Link>}>
          <Text type="supporting">Events per hour over the last 24 hours. First seen {formatDateTime(detail.firstSeen)}.</Text>
          <ProtocolTimeline buckets={detail.timeline} />
        </Panel>

        <Panel title="Who reached it">
          <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
            <CountTable header="Source address" rows={detail.topSources} countHeader="Events" linkTo={(ip) => `/investigate/ip/${ip}`} />
            <CountTable header="Country" rows={detail.topCountries} countHeader="Events" linkTo={(c) => `/events?sensor=${sensor.id}&country=${c}`} />
          </Grid>
        </Panel>

        {detail.topLists.length > 0 && (
          <Panel title="What they asked it for">
            <Text color="secondary">This sensor's own leaderboards: the fields that mean something for its protocols.</Text>
            <Grid columns={{ minWidth: 280, repeat: 'fit' }} gap={4}>
              {detail.topLists.map((list) =>
                list.rows.length ? (
                  <CountTable key={list.label} header={list.label} rows={list.rows} countHeader="Count" isCode />
                ) : (
                  <VStack key={list.label} gap={1}>
                    <Text weight="semibold">{list.label}</Text>
                    <Text type="supporting">Nothing recorded yet.</Text>
                  </VStack>
                ),
              )}
            </Grid>
          </Panel>
        )}

        {detail.requests ? (
          <Panel title={`${sensor.name}: requests & detections`}>
            <Table data={detail.requests} columns={requestColumns} idKey="id" density="compact" textOverflow="truncate" />
          </Panel>
        ) : (
          <Panel title="Latest events" action={<Link href={`/events?sensor=${sensor.id}`}>All events</Link>}>
            <Table data={detail.recentEvents} columns={eventColumns} idKey="id" density="compact" textOverflow="truncate" />
          </Panel>
        )}
      </VStack>
    </PageFrame>
  )
}
