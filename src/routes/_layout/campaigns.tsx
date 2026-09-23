import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/campaigns')({
  component: CampaignsPage,
})

function CampaignsPage() {
  return <PendingPage title="Campaigns" issue={10} />
}
