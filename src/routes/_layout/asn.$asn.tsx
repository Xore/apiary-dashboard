import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { EntityFrame } from '#/components/EntityFrame'
import { entityTabs } from '#/components/ViewTabs'
import type { ViewTab } from '#/components/ViewTabs'
import { NotFound } from '#/components/NotFound'
import { getAsn } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/asn/$asn')({
  staticData: { viewTabs: entityTabs({ label: 'Autonomous system views', basePath: (params) => `/asn/${encodeURIComponent(params.asn)}`, tabs: tabsFor }) },
  loader: async ({ params }) => {
    const asn = await getAsn(params.asn)
    if (!asn) throw notFound()
    return asn
  },
  notFoundComponent: () => <NotFound title="Autonomous system" description="No source from this autonomous system was seen." />,
  component: AsnLayout,
})

function AsnLayout() {
  const a = Route.useLoaderData()
  return (
    <EntityFrame
      kind="Autonomous system"
      title={a.asn}
      description={a.orgs.join(', ')}
      basePath={`/asn/${encodeURIComponent(a.asn)}`}
      facts={[
        { label: 'Source IPs', value: formatNumber(a.group.members.length) },
        { label: 'Networks', value: formatNumber(a.group.networks.length) },
        { label: 'Events', value: formatNumber(a.group.events.length) },
        { label: 'First seen', value: a.group.first ? formatDateTime(a.group.first) : '—' },
        { label: 'Last seen', value: a.group.last ? formatDateTime(a.group.last) : '—' },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}

/** The top-bar tabs: static until the loader data arrives, then with counts. */
function tabsFor(loaded: unknown): ViewTab[] {
  if (!loaded) return [{ id: 'overview', label: 'Overview' }, { id: 'sources', label: 'Sources' }, { id: 'networks', label: 'Networks' }, { id: 'events', label: 'Events' }, { id: 'timeline', label: 'Timeline' }]
  const data = loaded as ReturnType<typeof Route.useLoaderData>
  const a = data
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'sources', label: 'Sources', count: a.group.members.length },
    { id: 'networks', label: 'Networks', count: a.group.networks.length },
    { id: 'events', label: 'Events', count: a.group.events.length },
    { id: 'timeline', label: 'Timeline' },
  ]
}
