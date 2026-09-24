import { GroupOverview } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/clusters/$kind/$value')

export const Route = createFileRoute('/_layout/clusters/$kind/$value/')({
  component: () => {
    const c = parent.useLoaderData()
    return <GroupOverview group={c.group} base={`/clusters/${c.kind}/${encodeURIComponent(c.value)}`} sourcesTab="members" eventsTab="events" />
  },
})
