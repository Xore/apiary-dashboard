import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { VStack } from '@astryxdesign/core/Stack'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { RelatedPanel } from '#/components/Related'
import { getRelated } from '#/data/queries'
import { StatTile } from '#/components/DashboardBlocks'
import { EventsPanel } from '#/components/DetailBlocks'

const parent = getRouteApi('/_layout/ioc/$kind/$value')

export const Route = createFileRoute('/_layout/ioc/$kind/$value/')({
  loader: ({ params }) => getRelated('ioc', `${params.kind}:${params.value}`),
  component: IocOverview,
})

function IocOverview() {
  const ioc = parent.useLoaderData()
  const base = `/ioc/${ioc.kind}/${encodeURIComponent(ioc.value)}`
  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 170, repeat: 'fit' }} gap={4}>
        <StatTile label="Events" value={ioc.events.length} href={`${base}/events`} />
        <StatTile label="Source IPs" value={ioc.group.members.length} href={`${base}/sources`} />
        <StatTile label="Sessions" value={ioc.sessions.length} href={`${base}/sessions`} />
        <StatTile label="Payloads after it" value={ioc.payloads.length} href={`${base}/payloads`} />
      </Grid>
      <EventsPanel title="Newest events" events={ioc.events.slice(0, 5)} showSource action={<Link href={`${base}/events`}>All events</Link>} />
      <RelatedPanel center={ioc.value} groups={Route.useLoaderData()} />
    </VStack>
  )
}
