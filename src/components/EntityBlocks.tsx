import { useState } from 'react'
import { Link } from '@astryxdesign/core/Link'
import { List, ListItem } from '@astryxdesign/core/List'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import type { SessionSummary, TimelineItem, TimelineKind } from '#/data/types'
import { formatClock, formatDateTime, formatDay, formatNumber } from '#/lib/format'
import { Panel } from './DashboardBlocks'
import { EntityLink } from './EntityLink'
import { SeverityToken } from './SeverityToken'

const KIND_LABEL: Record<TimelineKind, string> = {
  event: 'Event',
  anomaly: 'ML anomaly',
  llm: 'LLM analysis',
  canary: 'Canarytoken',
  auth: 'Auth failure',
  alert: 'Alert',
}

/** Everything that happened, newest first, grouped by hour; filter by kind.
 * Each item links to its own page. */
export function Timeline({ items, empty = 'Nothing happened in this time range.' }: { items: TimelineItem[]; empty?: string }) {
  const kinds = [...new Set(items.map((i) => i.kind))]
  const [kind, setKind] = useState<'all' | TimelineKind>('all')
  const shown = kind === 'all' ? items : items.filter((i) => i.kind === kind)
  const groups = new Map<string, TimelineItem[]>()
  for (const item of shown.slice(0, 300)) {
    const hour = `${formatDay(item.at)} ${formatClock(item.at).slice(0, 2)}:00`
    if (!groups.has(hour)) groups.set(hour, [])
    groups.get(hour)!.push(item)
  }

  if (items.length === 0) return <Text type="supporting">{empty}</Text>
  return (
    <VStack gap={4}>
      {kinds.length > 1 && (
        <SegmentedControl label="Timeline kinds" size="sm" value={kind} onChange={(value) => setKind(value as 'all' | TimelineKind)}>
          <SegmentedControlItem value="all" label={`All (${items.length})`} />
          {kinds.map((k) => (
            <SegmentedControlItem key={k} value={k} label={`${KIND_LABEL[k]} (${items.filter((i) => i.kind === k).length})`} />
          ))}
        </SegmentedControl>
      )}
      {[...groups].map(([hour, list]) => (
        <VStack key={hour} gap={1}>
          <Text type="label" color="secondary">
            {hour} UTC · {list.length}
          </Text>
          <List density="compact" hasDividers>
            {list.map((item) => (
              <ListItem
                key={`${item.kind}-${item.id}`}
                label={item.href ? <Link href={item.href}>{item.title}</Link> : item.title}
                description={item.detail}
                startContent={<Text type="supporting">{formatClock(item.at)}</Text>}
                endContent={
                  <HStack gap={1}>
                    {kinds.length > 1 && <Token size="sm" label={KIND_LABEL[item.kind]} />}
                    {item.severity && <SeverityToken severity={item.severity} />}
                  </HStack>
                }
              />
            ))}
          </List>
        </VStack>
      ))}
      {shown.length > 300 && <Text type="supporting">Showing the newest 300 of {formatNumber(shown.length)}.</Text>}
    </VStack>
  )
}

const sessionColumns: TableColumn<SessionSummary>[] = [
  { key: 'id', header: 'Session', width: pixel(152), renderCell: (row) => <EntityLink kind="session" id={row.id} /> },
  { key: 'first', header: 'Started', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.first)}</Text> },
  { key: 'events', header: 'Events', width: pixel(72), align: 'end' },
  { key: 'logins', header: 'Logins', width: pixel(72), align: 'end' },
  { key: 'commands', header: 'Commands', width: pixel(88), align: 'end' },
  { key: 'downloads', header: 'Downloads', width: pixel(96), align: 'end' },
  { key: 'sensors', header: 'Sensors', width: proportional(2), renderCell: (row) => row.sensors.join(' ') },
  { key: 'recordingShasum', header: 'Recording', width: pixel(96), renderCell: (row) => (row.recordingShasum ? <EntityLink kind="recording" id={row.recordingShasum}>replay</EntityLink> : '—') },
]

export function SessionsTable({ sessions }: { sessions: SessionSummary[] }) {
  return sessions.length ? (
    <Table data={sessions} columns={sessionColumns} idKey="id" density="compact" hasHover />
  ) : (
    <Text type="supporting">No sessions in this time range.</Text>
  )
}

/** A titled list of values that each open their own page. */
export function ValueList({ title, kind, values, empty = 'Nothing recorded.' }: { title: string; kind: Parameters<typeof EntityLink>[0]['kind']; values: string[]; empty?: string }) {
  return (
    <Panel title={`${title} (${values.length})`}>
      {values.length ? (
        <VStack gap={1}>
          {values.map((v) => (
            <EntityLink key={v} kind={kind} id={v} />
          ))}
        </VStack>
      ) : (
        <Text type="supporting">{empty}</Text>
      )}
    </Panel>
  )
}
