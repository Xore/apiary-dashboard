import { HStack } from '@astryxdesign/core/Stack'
import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { categoryLabel } from '#/components/details/AgentCampaign'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { SeverityToken } from '#/components/SeverityToken'
import { getAgentCampaign } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/agent-campaigns/$id')({
  loader: async ({ params }) => {
    const detail = await getAgentCampaign(params.id)
    if (!detail) throw notFound()
    return detail
  },
  notFoundComponent: () => (
    <NotFound
      title="Agent campaign"
      description="No agent campaign has this id."
    />
  ),
  component: AgentCampaignLayout,
})

function AgentCampaignLayout() {
  const { campaign: c, events } = Route.useLoaderData()
  const rules = new Set(
    c.events.flatMap((e) => e.matchedRules.map((r) => r.rule)),
  )
  return (
    <EntityFrame
      kind="Agent campaign"
      title={c.id}
      basePath={`/agent-campaigns/${encodeURIComponent(c.id)}`}
      tokens={
        <HStack gap={1} wrap="wrap">
          <SeverityToken severity={c.severity} />
          {c.categories.map((category) => (
            <Token key={category} size="sm" label={categoryLabel(category)} />
          ))}
        </HStack>
      }
      facts={[
        { label: 'Started', value: formatDateTime(c.start) },
        { label: 'Ended', value: formatDateTime(c.end) },
        { label: 'Events', value: formatNumber(c.eventCount) },
        { label: 'Identifiers', value: formatNumber(c.identifiers.length) },
      ]}
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'evidence', label: 'Evidence timeline', count: c.events.length },
        { id: 'rules', label: 'Rules & decode chains', count: rules.size },
        { id: 'events', label: 'Events', count: events.length },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}
