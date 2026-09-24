import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { AgentCampaignEvidence } from '#/components/details/AgentCampaign'

const parent = getRouteApi('/_layout/agent-campaigns/$id')

export const Route = createFileRoute('/_layout/agent-campaigns/$id/evidence')({
  component: () => (
    <AgentCampaignEvidence campaign={parent.useLoaderData().campaign} />
  ),
})
