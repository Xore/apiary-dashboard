import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/kill-chain')({
  component: KillChainPage,
})

function KillChainPage() {
  return <PendingPage title="Kill-chain analytics" issue={10} />
}
