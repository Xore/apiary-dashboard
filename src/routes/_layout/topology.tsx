import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/topology')({
  component: TopologyPage,
})

function TopologyPage() {
  return <PendingPage title="Fleet topology" issue={11} />
}
