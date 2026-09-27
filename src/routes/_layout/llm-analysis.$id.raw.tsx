import { orPending } from '#/lib/pending'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
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
      <CodeBlock
        code={JSON.stringify(orPending(parent.useLoaderData())?.analysis, null, 2)}
        language="json"
        maxHeight={640}
      />
    </Panel>
  )
}
