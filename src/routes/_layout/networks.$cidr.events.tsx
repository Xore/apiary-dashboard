import { Link } from '@astryxdesign/core/Link'
import { RangeEvents } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/networks/$cidr')

export const Route = createFileRoute('/_layout/networks/$cidr/events')({
  component: () => {
    const n = parent.useLoaderData()
    return <RangeEvents events={n.group.events} action={<Link href={`/events?q=${encodeURIComponent(n.cidr)}`}>Event explorer</Link>} />
  },
})
