import { RangeTimeline } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/identities/$id')

export const Route = createFileRoute('/_layout/identities/$id/timeline')({
  component: () => {
    const d = parent.useLoaderData()
    return <RangeTimeline events={d.group.events} />
  },
})
