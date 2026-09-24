import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { EntityFrame } from '#/components/EntityFrame'
import { EntityLink } from '#/components/EntityLink'
import { NotFound } from '#/components/NotFound'
import { getCampaign } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/campaigns/$cidr')({
  loader: async ({ params }) => {
    const campaign = await getCampaign(params.cidr)
    if (!campaign) throw notFound()
    return campaign
  },
  notFoundComponent: () => <NotFound title="Campaign" description="No campaign was detected for this prefix." />,
  component: CampaignLayout,
})

function CampaignLayout() {
  const { campaign: c, group, shared } = Route.useLoaderData()
  return (
    <EntityFrame
      kind="Campaign"
      title={c.cidr}
      description={c.explanation}
      basePath={`/campaigns/${encodeURIComponent(c.cidr)}`}
      tokens={
        <>
          <Token size="sm" color="orange" label={`score ${c.score}`} />
          {c.scan && <Token size="sm" color="purple" label={`${c.scan} scan`} />}
        </>
      }
      facts={[
        { label: 'Network', value: <EntityLink kind="network" id={c.cidr} /> },
        { label: 'Source IPs', value: formatNumber(c.uniqueIps) },
        { label: 'Events', value: formatNumber(c.events) },
        { label: 'First seen', value: formatDateTime(c.first) },
        { label: 'Last seen', value: formatDateTime(c.last) },
      ]}
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'why', label: 'Why correlated', count: shared.length },
        { id: 'sources', label: 'Sources', count: group.members.length },
        { id: 'credentials', label: 'Credentials reused', count: group.credentials.length },
        { id: 'timeline', label: 'Timeline' },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}
