import { RangeEvents } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/clusters/$kind/$value')

export const Route = createFileRoute('/_layout/clusters/$kind/$value/events')({
  component: () => {
    const c = parent.useLoaderData()
    return <RangeEvents events={c.group.events} />
  },
})
