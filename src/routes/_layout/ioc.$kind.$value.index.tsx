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

const parent = getRouteApi('/_layout/ioc/$kind/$value')

export const Route = createFileRoute('/_layout/ioc/$kind/$value/')({
  ssr: pageSsr,
  loader: ({ params }) => unavailableOf(getRelated('ioc', `${params.kind}:${params.value}`)),
  component: IocOverview,
  pendingComponent: IocOverview,
})

function IocOverview() {
  const ioc = orPending(parent.useLoaderData())
  const { kind, value } = parent.useParams()
  const base = `/ioc/${kind}/${encodeURIComponent(value)}`
  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 170, repeat: 'fit' }} gap={4}>
        <StatTile label="Events" value={ioc?.events.length} href={`${base}/events`} />
        <StatTile label="Source IPs" value={ioc?.group.members.length} href={`${base}/sources`} />
        <StatTile label="Sessions" value={ioc?.sessions.length} href={`${base}/sessions`} />
        <StatTile label="Payloads after it" value={ioc?.payloads.length} href={`${base}/payloads`} />
      </Grid>
      <EventsPanel title="Newest events" events={ioc?.events.slice(0, 5)} showSource action={<ActionLink href={`${base}/events`}>All events</ActionLink>} />
      <RelatedPanel center={value} groups={orPending(Route.useLoaderData())} />
    </VStack>
  )
}
