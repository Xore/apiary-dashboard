import { GroupOverview } from '#/components/EntityBlocks'
import { VStack } from '@astryxdesign/core/Stack'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { RelatedPanel } from '#/components/Related'
import { getRelated } from '#/data/queries'

const parent = getRouteApi('/_layout/asn/$asn')

export const Route = createFileRoute('/_layout/asn/$asn/')({
  loader: ({ params }) => getRelated('asn', params.asn),
  component: () => {
    const a = parent.useLoaderData()
    return (
      <VStack gap={4}>
        <GroupOverview group={a.group} base={`/asn/${encodeURIComponent(a.asn)}`} sourcesTab="sources" eventsTab="events" />
        <RelatedPanel center={a.asn} groups={Route.useLoaderData()} />
      </VStack>
    )
  },
})
