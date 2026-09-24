import { RangeTimeline } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/networks/$cidr')

export const Route = createFileRoute('/_layout/networks/$cidr/timeline')({
  component: () => {
    const n = parent.useLoaderData()
    return <RangeTimeline events={n.group.events} />
  },
})
