import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { EntityFrame } from '#/components/EntityFrame'
import { entityTabs } from '#/components/ViewTabs'
import type { ViewTab } from '#/components/ViewTabs'
import { EntityLink } from '#/components/EntityLink'
import { NotFound } from '#/components/NotFound'
import { getNetwork } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

// {cidr} carries a literal "/", so every link percent-encodes it.
export const Route = createFileRoute('/_layout/networks/$cidr')({
  staticData: { viewTabs: entityTabs({ label: 'Network views', basePath: (params) => `/networks/${encodeURIComponent(params.cidr)}`, tabs: tabsFor }) },
  loader: async ({ params }) => {
    const network = await getNetwork(params.cidr)
    if (!network) throw notFound()
    return network
  },
  notFoundComponent: () => <NotFound title="Network" description="Invalid prefix, or no source in it was seen." />,
  component: NetworkLayout,
})

function NetworkLayout() {
  const n = Route.useLoaderData()
  return (
    <EntityFrame
      kind="Network"
      title={n.cidr}
      basePath={`/networks/${encodeURIComponent(n.cidr)}`}
      tokens={
        <>
          <EntityLink kind="country" id={n.country}>
            <Token size="sm" color="blue" label={n.country} />
          </EntityLink>
          {n.campaign && <Token size="sm" color="orange" label={`campaign · score ${n.campaign.score}`} />}
        </>
      }
      facts={[
        { label: 'Autonomous system', value: <EntityLink kind="asn" id={n.asn}>{`${n.asn} · ${n.org}`}</EntityLink> },
        { label: 'Source IPs', value: formatNumber(n.group.members.length) },
        { label: 'Events', value: formatNumber(n.group.events.length) },
        { label: 'First seen', value: n.group.first ? formatDateTime(n.group.first) : '—' },
        { label: 'Last seen', value: n.group.last ? formatDateTime(n.group.last) : '—' },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}

/** The top-bar tabs: static until the loader data arrives, then with counts. */
function tabsFor(loaded: unknown): ViewTab[] {
  if (!loaded) return [{ id: 'overview', label: 'Overview' }, { id: 'sources', label: 'Sources' }, { id: 'events', label: 'Events' }, { id: 'campaign', label: 'Campaign' }, { id: 'timeline', label: 'Timeline' }]
  const data = loaded as ReturnType<typeof Route.useLoaderData>
  const n = data
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'sources', label: 'Sources', count: n.group.members.length },
    { id: 'events', label: 'Events', count: n.group.events.length },
    { id: 'campaign', label: 'Campaign' },
    { id: 'timeline', label: 'Timeline' },
  ]
}
