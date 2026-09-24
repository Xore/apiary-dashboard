import { Grid } from '@astryxdesign/core/Grid'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { RelatedPanel } from '#/components/Related'
import { getRelated } from '#/data/queries'
import { Panel } from '#/components/DashboardBlocks'
import { EventsPanel } from '#/components/DetailBlocks'
import { EntityLink } from '#/components/EntityLink'

const parent = getRouteApi('/_layout/events/$id')

export const Route = createFileRoute('/_layout/events/$id/')({
  loader: ({ params }) => getRelated('event', params.id),
  component: EventOverview,
})

function EventOverview() {
  const { event, session } = parent.useLoaderData()
  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 340, repeat: 'fit' }} gap={4}>
        <Panel title="What the sensor captured">
          <Text type="code">{event.summary}</Text>
          <MetadataList label={{ position: 'start', width: 104 }}>
            {event.username && (
              <MetadataListItem label="Username">
                <EntityLink kind="username" id={event.username} />
              </MetadataListItem>
            )}
            {event.password && (
              <MetadataListItem label="Password">
                <EntityLink kind="password" id={event.password} />
              </MetadataListItem>
            )}
            {event.command && (
              <MetadataListItem label="Command">
                <EntityLink kind="command" id={event.command} />
              </MetadataListItem>
            )}
          </MetadataList>
        </Panel>
        <Panel title="Where it came from">
          <MetadataList label={{ position: 'start', width: 104 }}>
            <MetadataListItem label="Source">
              <EntityLink kind="source" id={event.srcIp}>{`${event.srcIp}:${event.srcPort}`}</EntityLink>
            </MetadataListItem>
            <MetadataListItem label="Network">
              <EntityLink kind="asn" id={event.asn} />
            </MetadataListItem>
            <MetadataListItem label="Country">
              <EntityLink kind="country" id={event.country} />
            </MetadataListItem>
            <MetadataListItem label="Port">
              <EntityLink kind="port" id={String(event.dstPort)} />
            </MetadataListItem>
          </MetadataList>
        </Panel>
      </Grid>
      <EventsPanel title="Around it in this session" events={session.slice(0, 8)} action={<EntityLink kind="session" id={event.sessionId}>Full session</EntityLink>} empty="This event is the whole session." />
      <RelatedPanel center={event.summary} groups={Route.useLoaderData()} />
    </VStack>
  )
}
