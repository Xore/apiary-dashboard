import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { ActionLink } from '#/components/ActionLink'
import { Grid } from '@astryxdesign/core/Grid'
import { VStack } from '@astryxdesign/core/Stack'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { RelatedPanel } from '#/components/Related'
import { getRelated } from '#/data/queries'
import { unavailableOf } from '#/lib/unavailable'
import { StatTile } from '#/components/DashboardBlocks'
import { EventsPanel } from '#/components/DetailBlocks'
import { osGuessCaption } from '#/components/EntityBlocks'

const parent = getRouteApi('/_layout/sources/$ip')

export const Route = createFileRoute('/_layout/sources/$ip/')({
  ssr: pageSsr,
  loader: ({ params }) => unavailableOf(getRelated('source', params.ip)),
  component: SourceOverview,
  pendingComponent: SourceOverview,
})

function SourceOverview() {
  const p = orPending(parent.useLoaderData())
  const { ip } = parent.useParams()
  const base = `/sources/${ip}`
  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 170, repeat: 'fit' }} gap={4}>
        <StatTile label="Events" value={p?.source.events} href={`${base}/events`} />
        <StatTile label="Logins" value={p?.source.logins} href={`/events?ip=${ip}&kind=login`} />
        <StatTile label="Sessions" value={p?.source.sessions} href={`${base}/sessions`} />
        <StatTile label="Sensors reached" value={p?.correlation.distinctSensors} href={`${base}/breakdown`} />
        <StatTile label="Tunnel connections" value={p?.correlation.tunnelConnections} caption={p ? osGuessCaption(p.correlation.tunnelOsGuesses) : ''} />
        <StatTile label="ATT&CK techniques" value={p?.techniques.length} href={`${base}/behavior`} />
      </Grid>
      <EventsPanel title="Newest events" events={p?.events.slice(0, 5)} action={<ActionLink href={`${base}/events`}>All events</ActionLink>} />
      <RelatedPanel center={parent.useParams().ip} groups={orPending(Route.useLoaderData())} />
    </VStack>
  )
}
