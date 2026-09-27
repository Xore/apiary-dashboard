import { JsonBlock } from '#/components/EntityBlocks'
import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/llm-analysis/$id')

export const Route = createFileRoute('/_layout/llm-analysis/$id/raw')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return (
    <Panel title="The stored document">
      <JsonBlock value={orPending(parent.useLoaderData())?.analysis} />
    </Panel>
  )
}
