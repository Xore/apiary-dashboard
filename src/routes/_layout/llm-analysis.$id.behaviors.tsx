import { pageSsr } from '#/lib/pageSsr'
import { SkeletonPanels } from '#/components/EntityBlocks'
import { orPending } from '#/lib/pending'
import { HStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/llm-analysis/$id')

export const Route = createFileRoute('/_layout/llm-analysis/$id/behaviors')({
  ssr: pageSsr,
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
    const analysis = orPending(parent.useLoaderData())?.analysis
    if (!analysis) return <SkeletonPanels count={2} />
    const { behaviors } = analysis
    return (
      <Panel title="Behaviors the model named">
        {behaviors.length ? (
          <HStack gap={1} wrap="wrap">
            {behaviors.map((b) => (
              <Token key={b} size="sm" color="purple" label={b} />
            ))}
          </HStack>
        ) : (
          <Text type="supporting">The model named no behaviors.</Text>
        )}
      </Panel>
    )
  }
