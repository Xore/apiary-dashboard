import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Selector } from '@astryxdesign/core/Selector'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { entityHref } from '#/lib/entities'
import { createFileRoute } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { SeverityToken } from '#/components/SeverityToken'
import { getEvents, getFacets } from '#/data/queries'
import { FilterSelect, listParam, toNumericParam, toParam } from '#/components/FilterSelect'
import type { FilterOption } from '#/components/FilterSelect'
import type { EventFilters, EventKind, Facets, HoneypotEvent } from '#/data/types'
import { downloadCsv, downloadJson } from '#/lib/export'
import { formatClock, formatNumber } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'
import { useLiveRefresh } from '#/lib/live'
import { ZoneHeader } from '#/components/ZoneHeader'
import { OpenInMenu } from '#/components/OpenInMenu'
import { useShellConfig } from '#/lib/session'
import { eventToolLinks } from '#/lib/toolLinks'

const KINDS: EventKind[] = ['connection', 'login', 'command', 'download', 'http', 'protocol', 'alert']
const SINCE = ['1h', '6h', '24h']
const FILTER_KEYS = ['ip', 'sensor', 'persona', 'provider', 'country', 'proto', 'port', 'kind', 'since', 'site', 'asset', 'fingerprint', 'org', 'city'] as const

/** Chip labels for filters that arrive by link rather than a control. */
const FILTER_LABEL: Partial<Record<(typeof FILTER_KEYS)[number], string>> = { site: 'decoy site', asset: 'decoy asset', fingerprint: 'fingerprint', org: 'network', city: 'city' }

// Each value filter lists every value seen, with counts, under the field.
const FILTERS: Array<{ key: 'ip' | 'sensor' | 'persona' | 'provider' | 'country' | 'proto' | 'port' | 'kind'; label: string; width: number; options: (f: Facets) => FilterOption[] }> = [
  { key: 'ip', label: 'Source IP', width: 170, options: (f) => f.sources },
  { key: 'sensor', label: 'Sensor', width: 170, options: (f) => f.sensors },
  { key: 'persona', label: 'Decoy persona', width: 190, options: (f) => f.personas },
  { key: 'provider', label: 'Provider', width: 130, options: (f) => f.providers },
  { key: 'country', label: 'Country', width: 130, options: (f) => f.countries },
  { key: 'proto', label: 'Protocol', width: 130, options: (f) => f.protocols },
  { key: 'port', label: 'Port', width: 110, options: (f) => f.ports },
  { key: 'kind', label: 'Kind', width: 130, options: (f) => f.kinds },
]

export const Route = createFileRoute('/_layout/events/')({
  // Deep links from other pages arrive here pre-scoped, e.g.
  // /events?ip=…, ?kind=login, ?country=CN, ?since=24h.
  validateSearch: (search: Record<string, unknown>): EventFilters => {
    // Comma lists, so ?sensor=a,b picks several and ?port=22 still works.
    const list = (key: string) => toParam(listParam(search[key]))
    return {
      ip: list('ip'),
      sensor: list('sensor'),
      persona: list('persona'),
      site: list('site'),
      asset: list('asset'),
      provider: list('provider'),
      org: list('org'),
      city: list('city'),
      // Matched whole: a User-Agent fingerprint can itself contain commas.
      fingerprint: typeof search.fingerprint === 'string' && search.fingerprint !== '' ? search.fingerprint : undefined,
      country: list('country'),
      proto: list('proto'),
      port: toNumericParam(listParam(search.port)),
      kind: toParam(listParam(search.kind).filter((k) => KINDS.includes(k as EventKind))),
      since: typeof search.since === 'string' && SINCE.includes(search.since) ? search.since : undefined,
    }
  },
  // An explicit ?since= wins; otherwise the app-wide range applies.
  loaderDeps: ({ search }) => ({ ...search, since: search.since ?? search.range }),
  loader: async ({ deps }) => {
    const [page, facets] = await Promise.all([getEvents(deps), getFacets()])
    return { ...page, facets }
  },
  component: EventsPage,
})

const columns: TableColumn<HoneypotEvent>[] = [
  { key: 'timestamp', header: <ZoneHeader label="Time" />, width: pixel(128), renderCell: (row) => <Text type="supporting">{formatClock(row.timestamp)}</Text> },
  { key: 'severity', header: 'Severity', width: pixel(96), renderCell: (row) => <SeverityToken severity={row.severity} /> },
  {
    key: 'sensor',
    header: 'Sensor',
    width: pixel(168),
    // The sensor, and the decoy asset it was wearing when hit.
    renderCell: (row) => (
      <VStack gap={0}>
        <Text>{row.sensor}</Text>
        {row.asset && <Text type="supporting">{row.asset}</Text>}
      </VStack>
    ),
  },
  {
    key: 'srcIp',
    header: 'Source',
    width: pixel(152),
    renderCell: (row) => (
      <HStack gap={1.5} vAlign="center">
        <EntityLink kind="source" id={row.srcIp} />
        <Text type="supporting">{row.country}</Text>
      </HStack>
    ),
  },
  { key: 'dstPort', header: 'Port', width: pixel(96), renderCell: (row) => `${row.dstPort}/${row.protocol}` },
  { key: 'summary', header: 'Detail', width: proportional(3), renderCell: (row) => <Text type="code">{row.summary}</Text> },
  { key: 'openIn', header: '', width: pixel(56), renderCell: (row) => <EventOpenIn event={row} /> },
]

function EventOpenIn({ event }: { event: HoneypotEvent }) {
  return <OpenInMenu compact links={eventToolLinks(event, useShellConfig().links)} />
}


function EventsPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  // New events join the list as they arrive, a few seconds at a time.
  const arrived = useLiveRefresh(3000)

  const setFilter = (patch: EventFilters) => void navigate({ search: (prev) => ({ ...prev, ...patch }) })
  const active = FILTER_KEYS.filter((key) => search[key] !== undefined)

  return (
    <RecordList
      title="Event explorer"
      description="Every normalized honeypot event, newest first. Filter by source, sensor, service, or time window."
      actions={
        <>
          <Text type="supporting">{`${formatNumber(data.total)} events${arrived ? ` · ${formatNumber(arrived)} arrived live` : ''}`}</Text>
          <Button
            label="CSV"
            size="sm"
            variant="secondary"
            icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
            onClick={() =>
              downloadCsv('events.csv', data.rows, ['timestamp', 'sensor', 'persona', 'asset', 'srcIp', 'country', 'city', 'org', 'provider', 'protocol', 'dstPort', 'type', 'severity', 'summary', 'fingerprint', 'sessionId'])
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
            {FILTERS.map((f) => (
              <FilterSelect
                key={f.key}
                label={f.label}
                isLabelHidden
                size="sm"
                width={f.width}
                placeholder={f.label}
                options={f.options(data.facets)}
                allowCustom={f.key === 'ip' || f.key === 'port'}
                value={listParam(search[f.key])}
                onChange={(values) => setFilter({ [f.key]: f.key === 'port' ? toNumericParam(values) : toParam(values) })}
              />
            ))}
            {/* A time window, not a value filter: a plain dropdown like the app-wide range. */}
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
                  label={`${FILTER_LABEL[key] ?? key}: ${search[key]}`}
                  onRemove={() => setFilter({ [key]: undefined })}
                />
              ))}
              <Button
                label="Clear all"
                size="sm"
                variant="ghost"
                onClick={() => void navigate({ search: {} })}
              />
            </HStack>
          )}
        </VStack>
      }
      rows={data.rows}
      columns={columns}
      getHref={(row) => entityHref('event', row.id)!}
      getId={(row) => row.id}
      emptyState={{ title: 'No events match these filters', description: 'Remove a filter or widen the time window.' }}
    />
  )
}
