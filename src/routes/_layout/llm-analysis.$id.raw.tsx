import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/llm-analysis/$id')

export const Route = createFileRoute('/_layout/llm-analysis/$id/raw')({
  component: () => (
    <Panel title="The stored document">
      <CodeBlock
        code={JSON.stringify(parent.useLoaderData().analysis, null, 2)}
        language="json"
        maxHeight={640}
      />
    </Panel>
  ),
})
