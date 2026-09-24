import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { NotFound } from '#/components/NotFound'
import { EntityFrame } from '#/components/EntityFrame'
import { entityTabs } from '#/components/ViewTabs'
import type { ViewTab } from '#/components/ViewTabs'
import { SeverityToken } from '#/components/SeverityToken'
import { getEventDetail } from '#/data/queries'
import { formatDateTime } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'

export const Route = createFileRoute('/_layout/events/$id')({
  staticData: { viewTabs: entityTabs({ label: 'Event views', basePath: (params) => `/events/${encodeURIComponent(params.id)}`, tabs: tabsFor }) },
  loader: async ({ params }) => {
    const detail = await getEventDetail(params.id)
    if (!detail) throw notFound()
    return detail
  },
  notFoundComponent: () => <NotFound title="Event" description="No event has this id. It may have aged out of the index." />,
  component: EventLayout,
})

function EventLayout() {
  const { event } = Route.useLoaderData()

  return (
    <EntityFrame
      kind="Event"
      title={event.summary}
      basePath={`/events/${encodeURIComponent(event.id)}`}
      tokens={
        <>
          <SeverityToken severity={event.severity} />
          <Token size="sm" label={event.type} />
        </>
      }
      facts={[
        { label: 'Time', value: formatDateTime(event.timestamp) },
        { label: 'Sensor', value: <EntityLink kind="sensor" id={event.sensor} /> },
        { label: 'Service', value: `${event.protocol.toUpperCase()} ${event.dstPort}` },
        { label: 'Source', value: <EntityLink kind="source" id={event.srcIp} /> },
        { label: 'Session', value: <EntityLink kind="session" id={event.sessionId} /> },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}

/** The top-bar tabs: static until the loader data arrives, then with counts. */
function tabsFor(loaded: unknown): ViewTab[] {
  if (!loaded) return [{ id: 'overview', label: 'Overview' }, { id: 'session', label: 'Session' }, { id: 'connection', label: 'Connection' }, { id: 'source', label: 'Source' }, { id: 'iocs', label: 'Indicators' }, { id: 'raw', label: 'Raw' }]
  const data = loaded as ReturnType<typeof Route.useLoaderData>
  const { event, session, connection, source, hashes } = data
  const iocs = hashes.length + [event.username, event.password, event.command].filter(Boolean).length + 3
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'session', label: 'Session', count: session.length },
    { id: 'connection', label: 'Connection', count: connection.length },
    { id: 'source', label: 'Source', count: source.length },
    { id: 'iocs', label: 'Indicators', count: iocs },
    { id: 'raw', label: 'Raw' },
  ]
}
