import { GroupOverview } from '#/components/EntityBlocks'
import { VStack } from '@astryxdesign/core/Stack'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { RelatedPanel } from '#/components/Related'
import { getRelated } from '#/data/queries'

const parent = getRouteApi('/_layout/networks/$cidr')

export const Route = createFileRoute('/_layout/networks/$cidr/')({
  loader: ({ params }) => getRelated('network', params.cidr),
  component: () => {
    const n = parent.useLoaderData()
    return (
      <VStack gap={4}>
        <GroupOverview group={n.group} base={`/networks/${encodeURIComponent(n.cidr)}`} sourcesTab="sources" eventsTab="events" />
        <RelatedPanel center={n.cidr} groups={Route.useLoaderData()} />
      </VStack>
    )
  },
})
