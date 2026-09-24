import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { getAsn } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/asn/$asn')({
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
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'sources', label: 'Sources', count: a.group.members.length },
        { id: 'networks', label: 'Networks', count: a.group.networks.length },
        { id: 'events', label: 'Events', count: a.group.events.length },
        { id: 'timeline', label: 'Timeline' },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}
