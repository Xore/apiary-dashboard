import { SkeletonPanels } from '#/components/EntityBlocks'
import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { AgentCampaignEvidence } from '#/components/details/AgentCampaign'

const parent = getRouteApi('/_layout/agent-campaigns/$id')

export const Route = createFileRoute('/_layout/agent-campaigns/$id/evidence')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  const rec = orPending(parent.useLoaderData())?.campaign
  return rec ? <AgentCampaignEvidence campaign={rec} /> : <SkeletonPanels />
}
