import { useState } from 'react'
import { Link } from '@astryxdesign/core/Link'
import { List, ListItem } from '@astryxdesign/core/List'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { Grid } from '@astryxdesign/core/Grid'
import { getRouteApi } from '@tanstack/react-router'
import { inRange } from '#/data/queries'
import type { HoneypotEvent, SessionSummary, SharedSignal, SourceGroup, SourceProfile, TimelineItem, TimelineKind } from '#/data/types'
import { rangeLabel } from '#/lib/range'
import { formatClock, formatDateTime, formatDay, formatNumber } from '#/lib/format'
import { MiniTable, Panel, StatTile } from './DashboardBlocks'
import { EventsPanel } from './DetailBlocks'
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

const layout = getRouteApi('/_layout')

/** The app-wide range, for pages that filter data they already loaded. */
export function useRange() {
  return layout.useSearch({ select: (search) => search.range })
}

export const eventTimeline = (events: HoneypotEvent[]): TimelineItem[] =>
  events.map((e) => ({
    id: e.id,
    at: e.timestamp,
    kind: 'event',
    title: e.summary,
    detail: `${e.srcIp} · ${e.sensor} · ${e.protocol.toUpperCase()} ${e.dstPort}`,
    severity: e.severity,
    href: `/events/${e.id}`,
  }))

/** A group's events inside the app-wide range, as a timeline. */
export function RangeTimeline({ events }: { events: HoneypotEvent[] }) {
  const range = useRange()
  return <Timeline items={eventTimeline(events.filter((e) => inRange(e.timestamp, range)))} />
}

/** A group's events inside the app-wide range, newest first. */
export function RangeEvents({ events, action }: { events: HoneypotEvent[]; action?: React.ReactNode }) {
  const range = useRange()
  const shown = events.filter((e) => inRange(e.timestamp, range))
  return (
    <VStack gap={2}>
      <EventsPanel title={`Events · ${rangeLabel(range).toLowerCase()} (${formatNumber(shown.length)})`} events={shown.slice(0, 200)} showSource action={action} empty="No events in this time range." />
      {shown.length > 200 && <Text type="supporting">Showing the newest 200. Open the Event explorer for all of them.</Text>}
    </VStack>
  )
}

const sourceColumns: TableColumn<SourceProfile>[] = [
  { key: 'ip', header: 'Address', width: pixel(152), renderCell: (row) => <EntityLink kind="source" id={row.ip} /> },
  { key: 'country', header: 'Country', width: pixel(80) },
  { key: 'org', header: 'Provider', width: proportional(1) },
  { key: 'events', header: 'Events', width: pixel(80), align: 'end' },
  { key: 'sessions', header: 'Sessions', width: pixel(88), align: 'end' },
  { key: 'sensors', header: 'Sensors', width: proportional(2), renderCell: (row) => row.sensors.join(' ') },
  { key: 'last', header: 'Last seen', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.last)}</Text> },
]

/** Source IPs, busiest first, each opening its own page. */
export function SourcesTable({ sources, empty = 'No source addresses.' }: { sources: SourceProfile[]; empty?: string }) {
  return sources.length ? <Table data={sources} columns={sourceColumns} idKey="ip" density="compact" hasHover /> : <Text type="supporting">{empty}</Text>
}

const SIGNAL_KIND = { credential: 'credential', fingerprint: 'fingerprint', payload: 'payload', network: 'network', asn: 'asn' } as const

const signalColumns: TableColumn<SharedSignal>[] = [
  { key: 'kind', header: 'Signal', width: pixel(112), renderCell: (row) => <Token size="sm" label={row.kind} /> },
  { key: 'value', header: 'Value', width: proportional(2), renderCell: (row) => <EntityLink kind={SIGNAL_KIND[row.kind]} id={row.value} /> },
  {
    key: 'members',
    header: 'Shared by',
    width: proportional(2),
    renderCell: (row) => (
      <HStack gap={2} wrap="wrap">
        {row.members.slice(0, 4).map((ip) => (
          <EntityLink key={ip} kind="source" id={ip} />
        ))}
        {row.members.length > 4 && <Text type="supporting">+{row.members.length - 4}</Text>}
      </HStack>
    ),
  },
]

/** Why these addresses are one group: the signals two or more share. */
export function SharedSignalsTable({ signals }: { signals: SharedSignal[] }) {
  return signals.length ? (
    <Table data={signals} columns={signalColumns} idKey="id" density="compact" />
  ) : (
    <Text type="supporting">No signal is shared by two or more members.</Text>
  )
}

/** The numbers and leaderboards every group page opens with. `sourcesTab` and
 * `eventsTab` name this entity's tabs for those lists, when it has them. */
export function GroupOverview({ group, base, sourcesTab, eventsTab }: { group: SourceGroup; base: string; sourcesTab?: string; eventsTab?: string }) {
  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 170, repeat: 'fit' }} gap={4}>
        <StatTile label="Source IPs" value={group.members.length} href={sourcesTab && `${base}/${sourcesTab}`} />
        <StatTile label="Events" value={group.events.length} href={eventsTab && `${base}/${eventsTab}`} />
        <StatTile label="Total matches" value={group.totalMatches} caption="honeypot, Suricata, portbridge" />
        <StatTile label="Tunnel connections" value={group.tunnelConnections} />
        <StatTile label="Sensors reached" value={group.sensors.length} />
      </Grid>
      <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
        <MiniTable title="Sensors" header="Sensor" rows={group.sensors} entity="sensor" />
        <MiniTable title="Targeted ports" header="Port" rows={group.ports} entity="port" />
        <MiniTable title="Credentials tried" header="user:password" rows={group.credentials.slice(0, 10)} entity="credential" />
        <MiniTable title="Commands" header="Command" rows={group.commands.slice(0, 10)} entity="command" />
        <MiniTable title="Networks" header="Prefix" rows={group.networks.slice(0, 10)} entity="network" />
        <MiniTable title="Countries" header="Country" rows={group.countries} entity="country" />
      </Grid>
    </VStack>
  )
}
