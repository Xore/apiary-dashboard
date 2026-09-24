import { GroupOverview } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/networks/$cidr')

export const Route = createFileRoute('/_layout/networks/$cidr/')({
  component: () => {
    const n = parent.useLoaderData()
    return <GroupOverview group={n.group} base={`/networks/${encodeURIComponent(n.cidr)}`} sourcesTab="sources" eventsTab="events" />
  },
})
