import { GroupOverview } from '#/components/EntityBlocks'
import { VStack } from '@astryxdesign/core/Stack'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { RelatedPanel } from '#/components/Related'
import { getRelated } from '#/data/queries'

const parent = getRouteApi('/_layout/clusters/$kind/$value')

export const Route = createFileRoute('/_layout/clusters/$kind/$value/')({
  loader: ({ params }) => getRelated('cluster', `${params.kind}:${params.value}`),
  component: () => {
    const c = parent.useLoaderData()
    return (
      <VStack gap={4}>
        <GroupOverview group={c.group} base={`/clusters/${c.kind}/${encodeURIComponent(c.value)}`} sourcesTab="members" eventsTab="events" />
        <RelatedPanel center={c.value} groups={Route.useLoaderData()} />
      </VStack>
    )
  },
})
