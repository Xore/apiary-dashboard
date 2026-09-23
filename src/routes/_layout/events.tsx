import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Selector } from '@astryxdesign/core/Selector'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { createFileRoute } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { SeverityToken } from '#/components/SeverityToken'
import { getEvents } from '#/data/queries'
import type { EventFilters, EventKind, HoneypotEvent, Protocol } from '#/data/types'
import { downloadCsv, downloadJson } from '#/lib/export'
import { formatClock, formatDateTime, formatNumber } from '#/lib/format'

const KINDS: EventKind[] = ['connection', 'login', 'command', 'download', 'http', 'alert']
const SINCE = ['1h', '6h', '24h']
const FILTER_KEYS = ['ip', 'sensor', 'country', 'proto', 'port', 'kind', 'since'] as const

export const Route = createFileRoute('/_layout/events')({
  // Deep links from other pages arrive here pre-scoped, e.g.
  // /events?ip=…, ?kind=login, ?country=CN, ?since=24h.
  validateSearch: (search: Record<string, unknown>): EventFilters => {
    const str = (key: string) => (typeof search[key] === 'string' && search[key] ? search[key] : undefined)
    const port = Number(search.port)
    return {
      ip: str('ip'),
      sensor: str('sensor'),
      country: str('country'),
      proto: str('proto') as Protocol | undefined,
      port: Number.isInteger(port) && port > 0 ? port : undefined,
      kind: KINDS.includes(search.kind as EventKind) ? (search.kind as EventKind) : undefined,
      since: str('since'),
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getEvents(deps),
  component: EventsPage,
})

const columns: TableColumn<HoneypotEvent>[] = [
  { key: 'timestamp', header: 'Time (UTC)', width: pixel(104), renderCell: (row) => <Text type="supporting">{formatClock(row.timestamp)}</Text> },
  { key: 'severity', header: 'Severity', width: pixel(96), renderCell: (row) => <SeverityToken severity={row.severity} /> },
  { key: 'sensor', header: 'Sensor', width: pixel(136) },
  {
    key: 'srcIp',
    header: 'Source',
    width: pixel(152),
    renderCell: (row) => (
      <HStack gap={1.5} vAlign="center">
        <Link href={`/investigate/ip/${row.srcIp}`}>{row.srcIp}</Link>
        <Text type="supporting">{row.country}</Text>
      </HStack>
    ),
  },
  { key: 'dstPort', header: 'Port', width: pixel(96), renderCell: (row) => `${row.dstPort}/${row.protocol}` },
  { key: 'summary', header: 'Detail', width: proportional(3), renderCell: (row) => <Text type="code">{row.summary}</Text> },
]

function EventInspector({ event }: { event: HoneypotEvent }) {
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <SeverityToken severity={event.severity} />
        <Token label={event.type} size="sm" />
      </HStack>
      <Text type="code">{event.summary}</Text>
      <MetadataList label={{ position: 'start', width: 104 }}>
        <MetadataListItem label="Time">{formatDateTime(event.timestamp)}</MetadataListItem>
        <MetadataListItem label="Source">
          <Link href={`/investigate/ip/${event.srcIp}`}>{`${event.srcIp}:${event.srcPort}`}</Link>
        </MetadataListItem>
        <MetadataListItem label="Network">{`${event.asn} · ${event.country}`}</MetadataListItem>
        <MetadataListItem label="Sensor">
          <Link href={`/sensors/${event.sensor}`}>{event.sensor}</Link>
        </MetadataListItem>
        <MetadataListItem label="Service">{`${event.protocol.toUpperCase()} ${event.dstPort}`}</MetadataListItem>
        <MetadataListItem label="Session">
          <Link href={`/sessions/${event.sessionId}`}>{event.sessionId}</Link>
        </MetadataListItem>
        {event.username && <MetadataListItem label="Credential">{`${event.username} / ${event.password}`}</MetadataListItem>}
      </MetadataList>
      <HStack gap={3} wrap="wrap">
        <Link href={`/events?ip=${event.srcIp}`}>All events from this IP</Link>
        <Link href={`/event/${event.id}`}>Open event page</Link>
      </HStack>
      <VStack gap={2}>
        <Heading level={3}>Normalized record</Heading>
        <CodeBlock code={JSON.stringify(event, null, 2)} language="json" maxHeight={320} />
      </VStack>
    </VStack>
  )
}

function EventsPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [ipDraft, setIpDraft] = useState(search.ip ?? '')

  const setFilter = (patch: EventFilters) => void navigate({ search: (prev) => ({ ...prev, ...patch }) })
  const active = FILTER_KEYS.filter((key) => search[key] !== undefined)

  return (
    <RecordList
      title="Event explorer"
      description="Every normalized honeypot event, newest first. Filter by source, sensor, service, or time window."
      actions={
        <>
          <Text type="supporting">{formatNumber(data.total)} events</Text>
          <Button
            label="CSV"
            size="sm"
            variant="secondary"
            icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
            onClick={() =>
              downloadCsv('events.csv', data.rows, ['timestamp', 'sensor', 'srcIp', 'country', 'protocol', 'dstPort', 'type', 'severity', 'summary', 'sessionId'])
            }
          />
          <Button
            label="JSON"
            size="sm"
            variant="secondary"
            icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
            onClick={() => downloadJson('events.json', data.rows)}
          />
        </>
      }
      toolbar={
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap" vAlign="center">
            <TextInput
              label="Source IP"
              isLabelHidden
              size="sm"
              width={180}
              placeholder="Source IP, Enter to apply"
              value={ipDraft}
              onChange={setIpDraft}
              onEnter={() => setFilter({ ip: ipDraft.trim() || undefined })}
            />
            <Selector
              label="Sensor"
              isLabelHidden
              size="sm"
              placeholder="Sensor"
              hasClear
              value={search.sensor ?? null}
              onChange={(value) => setFilter({ sensor: value ?? undefined })}
              options={data.values.sensors}
            />
            <Selector
              label="Country"
              isLabelHidden
              size="sm"
              placeholder="Country"
              hasClear
              value={search.country ?? null}
              onChange={(value) => setFilter({ country: value ?? undefined })}
              options={data.values.countries}
            />
            <Selector
              label="Protocol"
              isLabelHidden
              size="sm"
              placeholder="Protocol"
              hasClear
              value={search.proto ?? null}
              onChange={(value) => setFilter({ proto: (value ?? undefined) as Protocol | undefined })}
              options={data.values.protos}
            />
            <Selector
              label="Port"
              isLabelHidden
              size="sm"
              placeholder="Port"
              hasClear
              value={search.port ? String(search.port) : null}
              onChange={(value) => setFilter({ port: value ? Number(value) : undefined })}
              options={data.values.ports.map(String)}
            />
            <Selector
              label="Kind"
              isLabelHidden
              size="sm"
              placeholder="Kind"
              hasClear
              value={search.kind ?? null}
              onChange={(value) => setFilter({ kind: (value ?? undefined) as EventKind | undefined })}
              options={KINDS}
            />
            <Selector
              label="Time window"
              isLabelHidden
              size="sm"
              placeholder="Any time"
              hasClear
              value={search.since ?? null}
              onChange={(value) => setFilter({ since: value ?? undefined })}
              options={SINCE.map((value) => ({ value, label: `Last ${value}` }))}
            />
          </HStack>
          {active.length > 0 && (
            <HStack gap={1.5} wrap="wrap" vAlign="center">
              {active.map((key) => (
                <Token
                  key={key}
                  size="sm"
                  color="blue"
                  label={`${key}: ${search[key]}`}
                  onRemove={() => {
                    if (key === 'ip') setIpDraft('')
                    setFilter({ [key]: undefined })
                  }}
                />
              ))}
              <Button
                label="Clear all"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIpDraft('')
                  void navigate({ search: {} })
                }}
              />
            </HStack>
          )}
        </VStack>
      }
      rows={data.rows}
      columns={columns}
      getId={(row) => row.id}
      inspectorTitle="Event details"
      renderInspector={(row) => <EventInspector event={row} />}
      emptyState={{ title: 'No events match these filters', description: 'Remove a filter or widen the time window.' }}
    />
  )
}
