import { orPending } from '#/lib/pending'
import { GroupOverview } from '#/components/EntityBlocks'
import { VStack } from '@astryxdesign/core/Stack'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { RelatedPanel } from '#/components/Related'
import { getRelated } from '#/data/queries'

const parent = getRouteApi('/_layout/networks/$cidr')

export const Route = createFileRoute('/_layout/networks/$cidr/')({
  loader: ({ params }) => getRelated('network', params.cidr),
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
    const n = orPending(parent.useLoaderData())
    const { cidr } = parent.useParams()
    return (
      <VStack gap={4}>
        <GroupOverview group={n?.group} base={`/networks/${encodeURIComponent(cidr)}`} sourcesTab="sources" eventsTab="events" />
        <RelatedPanel center={cidr} groups={orPending(Route.useLoaderData())} />
      </VStack>
    )
  }
