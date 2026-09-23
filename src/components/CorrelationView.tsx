import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import type { Correlation } from '#/data/types'
import { MiniTable, Panel, StatTile } from './DashboardBlocks'
import { EventsPanel } from './DetailBlocks'
import { PageFrame } from './PageFrame'

/** Everything correlated for a set of member source IPs (a CIDR range or an
 * infrastructure cluster). */
export function CorrelationView({ title, description, correlation }: { title: string; description: string; correlation: Correlation }) {
  return (
    <PageFrame title={title} description={description}>
      <VStack gap={5}>
        <Grid columns={{ minWidth: 180, repeat: 'fit' }} gap={4}>
          <StatTile label="Member IPs" value={correlation.members.length} />
          <StatTile label="Total matches" value={correlation.totalMatches} />
          <StatTile label="Tunnel connections" value={correlation.tunnelConnections} />
          <StatTile label="Distinct sensors" value={correlation.sensors.length} />
        </Grid>
        <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={4}>
          <Panel title="Member IPs">
            <VStack gap={1}>
              {correlation.members.map((ip) => (
                <Link key={ip} href={`/investigate/ip/${ip}`}>
                  {ip}
                </Link>
              ))}
            </VStack>
            <Text type="supporting">Each opens that address's full attacker profile.</Text>
          </Panel>
          <MiniTable title="Sensors" header="Sensor" rows={correlation.sensors} linkTo={(s) => `/sensors/${s}`} />
        </Grid>
        <EventsPanel title="Correlated events" events={correlation.events} showSource />
      </VStack>
    </PageFrame>
  )
}
