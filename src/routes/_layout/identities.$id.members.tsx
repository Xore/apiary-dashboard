import { SkeletonPanels, SourcesTable } from '#/components/EntityBlocks'
import { orPending } from '#/lib/pending'
import { VStack } from '@astryxdesign/core/Stack'
import { AttackerGraph } from '#/components/AttackerGraph'
import { Panel } from '#/components/DashboardBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/identities/$id')

export const Route = createFileRoute('/_layout/identities/$id/members')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
    const d = orPending(parent.useLoaderData())
    return (
      <VStack gap={4}>
        <Panel title="The identity and its addresses">
          {d ? <AttackerGraph id={d.identity.id} ips={d.identity.ips} membersHref="#member-addresses" /> : <SkeletonPanels count={1} lines={8} />}
        </Panel>
        <div id="member-addresses">
          <Panel title="Member addresses">
            <SourcesTable sources={d?.group.members} />
          </Panel>
        </div>
      </VStack>
    )
  }
