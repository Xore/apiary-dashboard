import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { AgentCampaignFacts } from '#/components/details/AgentCampaign'

const parent = getRouteApi('/_layout/agent-campaigns/$id')

export const Route = createFileRoute('/_layout/agent-campaigns/$id/')({
  component: () => (
    <AgentCampaignFacts campaign={parent.useLoaderData().campaign} />
  ),
})
