import { Grid } from '@astryxdesign/core/Grid'
import { VStack } from '@astryxdesign/core/Stack'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable, StatTile } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/ioc/$kind/$value')

export const Route = createFileRoute('/_layout/ioc/$kind/$value/')({ component: IocOverview })

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
      <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
        <MiniTable title="Sensors" header="Sensor" rows={ioc.group.sensors} entity="sensor" />
        <MiniTable title="Networks" header="Prefix" rows={ioc.group.networks.slice(0, 10)} entity="network" />
        <MiniTable title="Countries" header="Country" rows={ioc.group.countries} entity="country" />
        <MiniTable title="Commands in the same sessions" header="Command" rows={ioc.group.commands.slice(0, 10)} entity="command" />
      </Grid>
    </VStack>
  )
}
