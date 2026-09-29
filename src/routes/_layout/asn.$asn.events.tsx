import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { RangeEvents } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/asn/$asn')

export const Route = createFileRoute('/_layout/asn/$asn/events')({
  ssr: pageSsr,
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
    const a = orPending(parent.useLoaderData())
    return <RangeEvents events={a?.group.events} />
  }
