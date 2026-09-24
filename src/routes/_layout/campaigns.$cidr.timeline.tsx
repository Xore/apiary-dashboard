import { RangeTimeline } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/campaigns/$cidr')

export const Route = createFileRoute('/_layout/campaigns/$cidr/timeline')({
  component: () => {
    const d = parent.useLoaderData()
    return <RangeTimeline events={d.group.events} />
  },
})
