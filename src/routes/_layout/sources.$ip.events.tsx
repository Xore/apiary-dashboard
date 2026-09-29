import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { ActionLink } from '#/components/ActionLink'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { EventsPanel } from '#/components/DetailBlocks'
import { getSourceEvents } from '#/data/queries'

const parent = getRouteApi('/_layout/sources/$ip')

export const Route = createFileRoute('/_layout/sources/$ip/events')({
  ssr: pageSsr,
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ params, deps }) => getSourceEvents(params.ip, deps.range),
  component: SourceEvents,
  pendingComponent: SourceEvents,
})

function SourceEvents() {
  const events = orPending(Route.useLoaderData())
  const { ip } = parent.useParams()
  return <EventsPanel title={events ? `Events in range (${events.length})` : "Events in range"} events={events} action={<ActionLink href={`/events?ip=${ip}`}>Filter in Event explorer</ActionLink>} empty="No events from this address in the time range." />
}
