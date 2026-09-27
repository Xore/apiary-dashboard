import { orPending } from '#/lib/pending'
import { ActionLink } from '#/components/ActionLink'
import { RangeEvents } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/networks/$cidr')

export const Route = createFileRoute('/_layout/networks/$cidr/events')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
    const n = orPending(parent.useLoaderData())
    const { cidr } = parent.useParams()
    return <RangeEvents events={n?.group.events} action={<ActionLink href={`/events?q=${encodeURIComponent(cidr)}`}>Event explorer</ActionLink>} />
  }
