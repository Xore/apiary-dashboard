import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable, Panel, StatTile } from '#/components/DashboardBlocks'
import { EventsPanel, TechniquesPanel } from '#/components/DetailBlocks'

const parent = getRouteApi('/_layout/sources/$ip')

export const Route = createFileRoute('/_layout/sources/$ip/')({ component: SourceOverview })

function SourceOverview() {
  const p = parent.useLoaderData()
  const { ip } = parent.useParams()
  const base = `/sources/${ip}`
  const related: Array<[string, string, number]> = [
    ['Sessions', 'sessions', p.source.sessions],
    ['Credential pairs', 'credentials', p.credentials.length],
    ['Commands', 'commands', p.commands.length],
    ['Downloads', 'payloads', p.payloads.length],
    ['IDS alerts', 'alerts', p.alerts.length],
  ]
  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 170, repeat: 'fit' }} gap={4}>
        <StatTile label="Events" value={p.source.events} href={`${base}/events`} />
        <StatTile label="Logins" value={p.source.logins} href={`/events?ip=${ip}&kind=login`} />
        <StatTile label="Sessions" value={p.source.sessions} href={`${base}/sessions`} />
        <StatTile label="Sensors reached" value={p.correlation.distinctSensors} />
      </Grid>
      <Panel title="Related">
        <HStack gap={4} wrap="wrap">
          {related.map(([label, tab, n]) => (
            <Link key={tab} href={`${base}/${tab}`}>{`${label} (${n})`}</Link>
          ))}
          <Link href={`${base}/network`}>Network & campaign</Link>
          {p.attackerId && <Link href={`${base}/identity`}>Attacker identity</Link>}
        </HStack>
      </Panel>
      <TechniquesPanel techniques={p.techniques} />
      <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
        <MiniTable title="Sensors contacted" header="Sensor" rows={p.sensors} entity="sensor" />
        <MiniTable title="Targeted ports" header="Port" rows={p.ports} entity="port" />
        <MiniTable title="Protocols" header="Protocol" rows={p.protocols} />
        <MiniTable title="HTTP paths" header="Path" rows={p.paths} entity="url" />
      </Grid>
      <EventsPanel title="Newest events" events={p.events.slice(0, 10)} action={<Link href={`${base}/events`}>All events</Link>} />
      <Text type="supporting">Behavior context only, never actor attribution.</Text>
    </VStack>
  )
}
