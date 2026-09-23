import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/agent-campaigns')({
  component: AgentCampaignsPage,
})

function AgentCampaignsPage() {
  return <PendingPage title="Agent campaigns" issue={9} />
}
