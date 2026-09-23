import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/clusters')({
  component: ClustersPage,
})

function ClustersPage() {
  return <PendingPage title="Infrastructure clusters" issue={10} />
}
