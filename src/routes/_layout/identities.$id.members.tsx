import { VStack } from '@astryxdesign/core/Stack'
import { AttackerGraph } from '#/components/AttackerGraph'
import { Panel } from '#/components/DashboardBlocks'
import { SourcesTable } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/identities/$id')

export const Route = createFileRoute('/_layout/identities/$id/members')({
  component: () => {
    const d = parent.useLoaderData()
    return (
      <VStack gap={4}>
        <Panel title="The identity and its addresses">
          <AttackerGraph id={d.identity.id} ips={d.identity.ips} membersHref="#member-addresses" />
        </Panel>
        <div id="member-addresses">
          <Panel title="Member addresses">
            <SourcesTable sources={d.group.members} />
          </Panel>
        </div>
      </VStack>
    )
  },
})
