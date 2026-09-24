import { RangeEvents } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/asn/$asn')

export const Route = createFileRoute('/_layout/asn/$asn/events')({
  component: () => {
    const a = parent.useLoaderData()
    return <RangeEvents events={a.group.events} />
  },
})
