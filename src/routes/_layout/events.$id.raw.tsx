import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/events/$id')

export const Route = createFileRoute('/_layout/events/$id/raw')({
  component: () => (
    <Panel title="The complete record">
      <CodeBlock code={JSON.stringify(parent.useLoaderData().event, null, 2)} language="json" maxHeight={640} />
    </Panel>
  ),
})
