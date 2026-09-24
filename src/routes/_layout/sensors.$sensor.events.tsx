import { Link } from '@astryxdesign/core/Link'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { EntityLink } from '#/components/EntityLink'
import { SeverityToken } from '#/components/SeverityToken'
import type { HoneypotEvent, SensorRequest } from '#/data/types'
import { formatClock } from '#/lib/format'

const parent = getRouteApi('/_layout/sensors/$sensor')

export const Route = createFileRoute('/_layout/sensors/$sensor/events')({ component: SensorEvents })

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

/** Web sensors show their own requests with detections; the rest, events. */
function SensorEvents() {
  const { detail } = parent.useLoaderData()
  const { sensor } = detail
  return detail.requests ? (
    <Panel title={`${sensor.name}: requests & detections`}>
      <Table data={detail.requests} columns={requestColumns} idKey="id" density="compact" textOverflow="truncate" />
    </Panel>
  ) : (
    <Panel title="Latest events" action={<Link href={`/events?sensor=${sensor.id}`}>All events</Link>}>
      <Table data={detail.recentEvents} columns={eventColumns} idKey="id" density="compact" textOverflow="truncate" />
    </Panel>
  )
}
