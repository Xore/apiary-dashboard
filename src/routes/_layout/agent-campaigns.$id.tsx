import { HStack } from '@astryxdesign/core/Stack'
import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { categoryLabel } from '#/components/details/AgentCampaign'
import { EntityFrame } from '#/components/EntityFrame'
import { entityTabs } from '#/components/ViewTabs'
import type { ViewTab } from '#/components/ViewTabs'
import { NotFound } from '#/components/NotFound'
import { SeverityToken } from '#/components/SeverityToken'
import { getAgentCampaign } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/agent-campaigns/$id')({
  staticData: { viewTabs: entityTabs({ label: 'Agent campaign views', basePath: (params) => `/agent-campaigns/${encodeURIComponent(params.id)}`, tabs: tabsFor }) },
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
  const { campaign: c } = Route.useLoaderData()
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
    >
      <Outlet />
    </EntityFrame>
  )
}

/** The top-bar tabs: static until the loader data arrives, then with counts. */
function tabsFor(loaded: unknown): ViewTab[] {
  if (!loaded) return [{ id: 'overview', label: 'Overview' }, { id: 'evidence', label: 'Evidence timeline' }, { id: 'rules', label: 'Rules & decode chains' }, { id: 'events', label: 'Events' }]
  const { campaign: c, events } = loaded as NonNullable<Awaited<ReturnType<typeof getAgentCampaign>>>
  const rules = new Set(c.events.flatMap((e) => e.matchedRules.map((r) => r.rule)))
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'evidence', label: 'Evidence timeline', count: c.events.length },
    { id: 'rules', label: 'Rules & decode chains', count: rules.size },
    { id: 'events', label: 'Events', count: events.length },
  ]
}
