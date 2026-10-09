import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { GroupOverview } from '#/components/EntityBlocks'
import { VStack } from '@astryxdesign/core/Stack'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { RelatedPanel } from '#/components/Related'
import { getRelated } from '#/data/queries'
import { backendGapOf } from '#/lib/backendGap'

const parent = getRouteApi('/_layout/asn/$asn')

export const Route = createFileRoute('/_layout/asn/$asn/')({
  ssr: pageSsr,
  loader: ({ params }) => backendGapOf(getRelated('asn', params.asn)),
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
    const a = orPending(parent.useLoaderData())
    const { asn } = parent.useParams()
    return (
      <VStack gap={4}>
        <GroupOverview group={a?.group} base={`/asn/${encodeURIComponent(asn)}`} sourcesTab="sources" eventsTab="events" />
        <RelatedPanel center={asn} groups={orPending(Route.useLoaderData())} />
      </VStack>
    )
  }
