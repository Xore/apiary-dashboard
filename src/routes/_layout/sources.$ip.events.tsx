import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Link } from '@astryxdesign/core/Link'
import { EventsPanel } from '#/components/DetailBlocks'
import { getSourceEvents } from '#/data/queries'

const parent = getRouteApi('/_layout/sources/$ip')

export const Route = createFileRoute('/_layout/sources/$ip/events')({
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ params, deps }) => getSourceEvents(params.ip, deps.range),
  component: SourceEvents,
})

function SourceEvents() {
  const events = Route.useLoaderData()
  const { ip } = parent.useParams()
  return <EventsPanel title={`Events in range (${events.length})`} events={events} action={<Link href={`/events?ip=${ip}`}>Filter in Event explorer</Link>} empty="No events from this address in the time range." />
}
