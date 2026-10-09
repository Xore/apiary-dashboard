import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { GroupOverview } from '#/components/EntityBlocks'
import { VStack } from '@astryxdesign/core/Stack'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { RelatedPanel } from '#/components/Related'
import { getRelated } from '#/data/queries'
import { unavailableOf } from '#/lib/unavailable'

const parent = getRouteApi('/_layout/clusters/$kind/$value')

export const Route = createFileRoute('/_layout/clusters/$kind/$value/')({
  ssr: pageSsr,
  loader: ({ params }) => unavailableOf(getRelated('cluster', `${params.kind}:${params.value}`)),
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
    const c = orPending(parent.useLoaderData())
    const { kind, value } = parent.useParams()
    return (
      <VStack gap={4}>
        <GroupOverview group={c?.group} base={`/clusters/${kind}/${encodeURIComponent(value)}`} sourcesTab="members" eventsTab="events" />
        <RelatedPanel center={value} groups={orPending(Route.useLoaderData())} />
      </VStack>
    )
  }
