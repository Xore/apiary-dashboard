import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { getCluster } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/clusters/$kind/$value')({
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
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'members', label: 'Member IPs', count: c.group.members.length },
        { id: 'events', label: 'Events', count: c.group.events.length },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}
