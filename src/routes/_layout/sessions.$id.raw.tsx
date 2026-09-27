import { orPending } from '#/lib/pending'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/sessions/$id')

export const Route = createFileRoute('/_layout/sessions/$id/raw')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return (
    <Panel title="Every record in this session">
      <CodeBlock code={JSON.stringify(orPending(parent.useLoaderData())?.events, null, 2)} language="json" maxHeight={640} />
    </Panel>
  )
}
