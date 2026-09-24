import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { VStack } from '@astryxdesign/core/Stack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { ProtocolTimeline } from '#/components/charts'
import { CountTable, Panel } from '#/components/DashboardBlocks'
import { formatDateTime, formatNumber } from '#/lib/format'

const parent = getRouteApi('/_layout/sensors/$sensor')

export const Route = createFileRoute('/_layout/sensors/$sensor/')({ component: SensorOverview })

function SensorOverview() {
  const { detail } = parent.useLoaderData()
  const { sensor } = detail
  return (
    <VStack gap={5}>
      <Panel title="What this sensor did">
        <Text color="secondary">{`${detail.reading.what}. The quantities this sensor exists to produce, not an event count, which says the same thing about every sensor.`}</Text>
        <Grid columns={{ minWidth: 180, repeat: 'fit' }} gap={3}>
          {detail.measures.map((m) => (
            <Card key={m.label} variant="muted">
              <VStack gap={1}>
                <Heading level={3}>{formatNumber(m.value)}</Heading>
                <Text type="label" color="secondary">
                  {m.label}
                </Text>
                <Text type="supporting">busiest source: {m.peak}</Text>
              </VStack>
            </Card>
          ))}
        </Grid>
      </Panel>
      <Panel title="Activity" action={<Link href={`/events?sensor=${sensor.id}`}>All events</Link>}>
        <Text type="supporting">Events per hour over the last 24 hours. First seen {formatDateTime(detail.firstSeen)}.</Text>
        <ProtocolTimeline buckets={detail.timeline} />
      </Panel>
      <Panel title="Event types">
        <CountTable header="Type" rows={detail.byType} countHeader="Events" linkTo={(t) => `/events?sensor=${sensor.id}&kind=${t}`} />
      </Panel>
    </VStack>
  )
}
