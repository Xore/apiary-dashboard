import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { EventsPanel } from '#/components/DetailBlocks'

const parent = getRouteApi('/_layout/events/$id')

export const Route = createFileRoute('/_layout/events/$id/connection')({ ssr: pageSsr, component: Tab, pendingComponent: Tab })

function Tab() {
  const d = orPending(parent.useLoaderData())
  return <EventsPanel title="The rest of this connection" events={d?.connection} empty="No other event on this connection." />
}
