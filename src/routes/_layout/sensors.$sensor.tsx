import { Selector } from '@astryxdesign/core/Selector'
import { HStack } from '@astryxdesign/core/Stack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'
import { Outlet, createFileRoute, notFound, useLocation, useNavigate } from '@tanstack/react-router'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { getSensorCatalog, getSensorDetail, getSourceHealth, getTopology } from '#/data/queries'
import type { SensorStatus } from '#/data/types'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/sensors/$sensor')({
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
    <Selector
      label="Sensor"
      isLabelHidden
      size="sm"
      value={current}
      onChange={(value) => void navigate({ href: `/sensors/${encodeURIComponent(value)}${tab ? `/${tab}` : ''}` })}
      options={sensors.map((s) => ({ value: s, label: s }))}
    />
  )
}

function SensorLayout() {
  const { detail, catalog, feed, exposure } = Route.useLoaderData()
  const { sensor } = detail

  return (
    <EntityFrame
      kind="Sensor"
      title={sensor.name}
      description={`${sensor.kind} · ${sensor.location} · ${sensor.protocols.map((p) => p.toUpperCase()).join(', ')}`}
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
      ]}
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'events', label: detail.requests ? 'Requests' : 'Events' },
        { id: 'sources', label: 'Sources', count: detail.topSources.length },
        { id: 'leaderboards', label: 'Leaderboards', count: detail.topLists.length },
        { id: 'health', label: feed ? `Health · ${feed.state}` : 'Health' },
        { id: 'exposure', label: 'Exposure', count: exposure?.ports.length },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}
