import { ActionLink } from '#/components/ActionLink'
import { RangeEvents } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/networks/$cidr')

export const Route = createFileRoute('/_layout/networks/$cidr/events')({
  component: () => {
    const n = parent.useLoaderData()
    return <RangeEvents events={n.group.events} action={<ActionLink href={`/events?q=${encodeURIComponent(n.cidr)}`}>Event explorer</ActionLink>} />
  },
})
