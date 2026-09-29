import { pageSsr } from '#/lib/pageSsr'
import { JsonBlock } from '#/components/EntityBlocks'
import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/sessions/$id')

export const Route = createFileRoute('/_layout/sessions/$id/raw')({
  ssr: pageSsr,
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return (
    <Panel title="Every record in this session">
      <JsonBlock value={orPending(parent.useLoaderData())?.events} />
    </Panel>
  )
}
