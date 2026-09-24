import { Link } from '@astryxdesign/core/Link'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { EntityLink } from '#/components/EntityLink'
import type { HoneypotEvent, SensorReading } from '#/data/types'
import { formatClock } from '#/lib/format'
import { fieldText, readField } from '#/lib/sensorFields'

const parent = getRouteApi('/_layout/sensors/$sensor')

export const Route = createFileRoute('/_layout/sensors/$sensor/events')({ component: SensorEvents })

const BADGE_COLOR = { danger: 'red', warning: 'orange', success: 'green', muted: 'gray', info: 'blue' } as const

/** Time, source and port for every sensor; then the sensor's own columns,
 * read from its own fields; then the artefact it exists to capture. */
function columnsFor(reading: SensorReading): TableColumn<HoneypotEvent>[] {
  const own: TableColumn<HoneypotEvent>[] = reading.columns.map((column, index) => ({
    key: `field-${index}`,
    header: column.header,
    width: column.mono ? proportional(2) : proportional(1),
    renderCell: (row) => {
      const text = fieldText(readField(row.fields, column.field))
      if (!text) return <Text type="supporting">—</Text>
      if (column.badge) return <Token size="sm" color={BADGE_COLOR[column.badge]} label={text} />
      return <Text type={column.mono ? 'code' : 'supporting'}>{text}</Text>
    },
  }))
  const artefact = reading.artefacts.at(0)
  return [
    { key: 'timestamp', header: 'Time (UTC)', width: pixel(96), renderCell: (row) => <EntityLink kind="event" id={row.id}>{formatClock(row.timestamp)}</EntityLink> },
    { key: 'srcIp', header: 'Source', width: pixel(140), renderCell: (row) => <EntityLink kind="source" id={row.srcIp} /> },
    { key: 'dstPort', header: 'Port', width: pixel(72), renderCell: (row) => <Text type="code">{row.dstPort}</Text> },
    ...own,
    ...(artefact
      ? [
          {
            key: 'artefact',
            header: artefact.label,
            width: proportional(2),
            renderCell: (row: HoneypotEvent) => {
              const text = fieldText(readField(row.fields, artefact.field))
              return text ? <Text type="code">{text}</Text> : <Text type="supporting">—</Text>
            },
          },
        ]
      : []),
  ]
}

/** Every sensor, read in its own terms. */
function SensorEvents() {
  const { detail } = parent.useLoaderData()
  const { sensor, reading } = detail
  return (
    <Panel title="What it captured" action={<Link href={`/events?sensor=${sensor.id}`}>All events</Link>}>
      <Text type="supporting">{reading.what}. The newest events, with this sensor's own fields; open a row for the full record.</Text>
      <Table data={detail.recentEvents} columns={columnsFor(reading)} idKey="id" density="compact" textOverflow="truncate" />
    </Panel>
  )
}
