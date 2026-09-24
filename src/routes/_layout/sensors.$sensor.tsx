import { HStack } from '@astryxdesign/core/Stack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'
import { Outlet, createFileRoute, notFound, useLocation, useNavigate } from '@tanstack/react-router'
import { EntityFrame } from '#/components/EntityFrame'
import { EntityLink } from '#/components/EntityLink'
import { FilterSelect } from '#/components/FilterSelect'
import { entityTabs } from '#/components/ViewTabs'
import type { ViewTab } from '#/components/ViewTabs'
import { NotFound } from '#/components/NotFound'
import { getSensorCatalog, getSensorDetail, getSourceHealth, getTopology } from '#/data/queries'
import type { SensorStatus } from '#/data/types'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/sensors/$sensor')({
  staticData: { viewTabs: entityTabs({ label: 'Sensor views', basePath: (params) => `/sensors/${encodeURIComponent(params.sensor)}`, tabs: tabsFor }) },
  loader: async ({ params }) => {
    const [detail, catalog, health, topology] = await Promise.all([getSensorDetail(params.sensor), getSensorCatalog(), getSourceHealth(), getTopology()])
    if (!detail) throw notFound()
    return {
      detail,
      catalog,
      feed: health.feeds.find((f) => f.sensor === params.sensor),
      exposure: topology.sensors.find((s) => s.sensor === params.sensor),
    }
  },
  notFoundComponent: () => <NotFound title="Sensor detail" description="No sensor has this name." />,
  component: SensorLayout,
})

const STATUS_VARIANT = { online: 'success', degraded: 'warning', offline: 'error' } as const satisfies Record<SensorStatus, string>

/** Jump to another sensor, staying on the same tab. */
function SensorPicker({ current, sensors }: { current: string; sensors: string[] }) {
  const navigate = useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })
  const tab = pathname.split('/').slice(3).join('/')
  return (
    <FilterSelect
      label="Sensor"
      isLabelHidden
      size="sm"
      width={200}
      mode="single"
      options={sensors.map((s) => ({ value: s }))}
      value={[current]}
      onChange={([value]) => value && void navigate({ href: `/sensors/${encodeURIComponent(value)}${tab ? `/${tab}` : ''}` })}
    />
  )
}

function SensorLayout() {
  const { detail, catalog } = Route.useLoaderData()
  const { sensor } = detail

  return (
    <EntityFrame
      kind="Sensor"
      title={sensor.name}
      description={`${sensor.kind} · ${sensor.location} · ${sensor.protocols.join(', ')}`}
      basePath={`/sensors/${encodeURIComponent(sensor.id)}`}
      tokens={
        <HStack gap={1.5} vAlign="center">
          <StatusDot variant={STATUS_VARIANT[sensor.status]} label={sensor.status} />
          <Text>{sensor.status}</Text>
        </HStack>
      }
      actions={<SensorPicker current={sensor.id} sensors={catalog.map((c) => c.sensor)} />}
      facts={[
        { label: 'Events / 24h', value: formatNumber(sensor.eventsLast24h) },
        { label: 'Unique sources', value: formatNumber(detail.uniqueSources) },
        { label: 'First seen', value: formatDateTime(detail.firstSeen) },
        { label: 'Last event', value: formatDateTime(sensor.lastSeen) },
        { label: 'Decoy', value: sensor.persona ? <EntityLink kind="persona" id={sensor.persona.id}>{`${sensor.persona.id} · ${sensor.persona.organization}`}</EntityLink> : 'none' },
        { label: 'Listens on', value: sensor.ports.length ? sensor.ports.map((p) => `${p.port}/${p.proto}`).join(', ') : 'no listener' },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}

/** The top-bar tabs: static until the loader data arrives, then with counts. */
function tabsFor(loaded: unknown): ViewTab[] {
  if (!loaded) return [{ id: 'overview', label: 'Overview' }, { id: 'events', label: 'Captured' }, { id: 'sources', label: 'Sources' }, { id: 'leaderboards', label: 'Leaderboards' }, { id: 'health', label: 'Health' }, { id: 'exposure', label: 'Exposure' }]
  const data = loaded as ReturnType<typeof Route.useLoaderData>
  const { detail, feed, exposure } = data
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'events', label: 'Captured' },
    { id: 'sources', label: 'Sources', count: detail.topSources.length },
    { id: 'leaderboards', label: 'Leaderboards', count: detail.topLists.length },
    { id: 'health', label: feed ? `Health · ${feed.state}` : 'Health' },
    { id: 'exposure', label: 'Exposure', count: exposure?.ports.length },
  ]
}
