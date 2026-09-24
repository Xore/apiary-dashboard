import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { EntityFrame } from '#/components/EntityFrame'
import { entityTabs } from '#/components/ViewTabs'
import type { ViewTab } from '#/components/ViewTabs'
import { NotFound } from '#/components/NotFound'
import { getCluster } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/clusters/$kind/$value')({
  staticData: { viewTabs: entityTabs({ label: 'Infrastructure cluster views', basePath: (params) => `/clusters/${params.kind}/${encodeURIComponent(params.value)}`, tabs: tabsFor }) },
  loader: async ({ params }) => {
    const cluster = await getCluster(params.kind, params.value)
    if (!cluster) throw notFound()
    return cluster
  },
  notFoundComponent: () => <NotFound title="Cluster" description="Unknown kind, or no source shares this value." />,
  component: ClusterLayout,
})

function ClusterLayout() {
  const c = Route.useLoaderData()
  return (
    <EntityFrame
      kind={`Infrastructure cluster · ${c.kind}`}
      title={c.value}
      description="Source IPs that share this signal."
      basePath={`/clusters/${c.kind}/${encodeURIComponent(c.value)}`}
      tokens={<Token size="sm" label={c.kind} />}
      facts={[
        { label: 'Source IPs', value: formatNumber(c.group.members.length) },
        { label: 'Events', value: formatNumber(c.group.events.length) },
        { label: 'Sensors', value: formatNumber(c.group.sensors.length) },
        { label: 'Last seen', value: c.group.last ? formatDateTime(c.group.last) : '—' },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}

/** The top-bar tabs: static until the loader data arrives, then with counts. */
function tabsFor(loaded: unknown): ViewTab[] {
  if (!loaded) return [{ id: 'overview', label: 'Overview' }, { id: 'members', label: 'Member IPs' }, { id: 'events', label: 'Events' }, { id: 'timeline', label: 'Timeline' }]
  const data = loaded as ReturnType<typeof Route.useLoaderData>
  const c = data
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Member IPs', count: c.group.members.length },
    { id: 'events', label: 'Events', count: c.group.events.length },
    { id: 'timeline', label: 'Timeline' },
  ]
}
