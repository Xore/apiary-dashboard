import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { EntityFrame } from '#/components/EntityFrame'
import { entityTabs } from '#/components/ViewTabs'
import type { ViewTab } from '#/components/ViewTabs'
import { EntityLink } from '#/components/EntityLink'
import { NotFound } from '#/components/NotFound'
import { getSessionDetail } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/sessions/$id')({
  staticData: { viewTabs: entityTabs({ label: 'Session views', basePath: (params) => `/sessions/${encodeURIComponent(params.id)}`, tabs: tabsFor }) },
  loader: async ({ params }) => {
    const detail = await getSessionDetail(params.id)
    if (!detail) throw notFound()
    return detail
  },
  notFoundComponent: () => <NotFound title="Session" description="No events found for this session id in the current window." />,
  component: SessionLayout,
})

function SessionLayout() {
  const s = Route.useLoaderData()
  const minutes = Math.max(1, Math.round((Date.parse(s.last) - Date.parse(s.first)) / 60_000))

  return (
    <EntityFrame
      kind="Session"
      title={s.id}
      basePath={`/sessions/${encodeURIComponent(s.id)}`}
      tokens={
        <EntityLink kind="country" id={s.country}>
          <Token size="sm" color="blue" label={s.country} />
        </EntityLink>
      }
      facts={[
        { label: 'Source', value: <EntityLink kind="source" id={s.srcIp} /> },
        { label: 'Started', value: formatDateTime(s.first) },
        { label: 'Duration', value: `${formatNumber(minutes)} min` },
        { label: 'Events', value: formatNumber(s.events.length) },
        { label: 'Sensors', value: s.sensors.map((r) => r.label).join(', ') },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}

/** The top-bar tabs: static until the loader data arrives, then with counts. */
function tabsFor(loaded: unknown): ViewTab[] {
  if (!loaded) return [{ id: 'timeline', label: 'Timeline' }, { id: 'commands', label: 'Commands' }, { id: 'credentials', label: 'Credentials' }, { id: 'downloads', label: 'Downloads' }, { id: 'recording', label: 'Recording' }, { id: 'attck', label: 'ATT&CK' }, { id: 'raw', label: 'Raw' }]
  const data = loaded as ReturnType<typeof Route.useLoaderData>
  const s = data
  return [
    { id: 'timeline', label: 'Timeline', count: s.events.length },
    { id: 'commands', label: 'Commands', count: s.commands.length },
    { id: 'credentials', label: 'Credentials', count: s.credentials.length },
    { id: 'downloads', label: 'Downloads', count: s.payloads.length },
    { id: 'recording', label: 'Recording' },
    { id: 'attck', label: 'ATT&CK', count: s.techniques.length },
    // A mail sensor's session carries the message it delivered.
    ...(s.events.some((e: { sensor: string }) => e.sensor === 'mailoney') ? [{ id: 'mail', label: 'Message' }] : []),
    { id: 'raw', label: 'Raw' },
  ]
}
