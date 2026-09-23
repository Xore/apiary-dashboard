import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { EventsPanel } from '#/components/DetailBlocks'
import { NotFound } from '#/components/NotFound'
import { PageFrame } from '#/components/PageFrame'
import { SeverityToken } from '#/components/SeverityToken'
import { getEventDetail } from '#/data/queries'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/event/$id')({
  loader: async ({ params }) => {
    const detail = await getEventDetail(params.id)
    if (!detail) throw notFound()
    return detail
  },
  notFoundComponent: () => <NotFound title="Event" description="No event has this id. It may have aged out of the index." />,
  component: EventPage,
})

function EventPage() {
  const { event, session, connection, source, hashes } = Route.useLoaderData()

  return (
    <PageFrame
      title="Event"
      description={`${event.summary} · ${formatDateTime(event.timestamp)}`}
      actions={
        <HStack gap={3}>
          <Link href={`/investigate/ip/${event.srcIp}`}>Attacker profile</Link>
          <Link href={`/sessions/${event.sessionId}`}>Session</Link>
        </HStack>
      }
    >
      <VStack gap={5}>
        <Grid columns={{ minWidth: 340, repeat: 'fit' }} gap={4}>
          <Panel title="What this event is">
            <HStack gap={2} vAlign="center">
              <SeverityToken severity={event.severity} />
              <Token size="sm" label={event.type} />
            </HStack>
            <MetadataList label={{ position: 'start', width: 104 }}>
              <MetadataListItem label="Time">{formatDateTime(event.timestamp)}</MetadataListItem>
              <MetadataListItem label="Sensor">
                <Link href={`/sensors/${event.sensor}`}>{event.sensor}</Link>
              </MetadataListItem>
              <MetadataListItem label="Service">{`${event.protocol.toUpperCase()} ${event.dstPort}`}</MetadataListItem>
              <MetadataListItem label="Source">
                <Link href={`/investigate/ip/${event.srcIp}`}>{`${event.srcIp}:${event.srcPort}`}</Link>
              </MetadataListItem>
              <MetadataListItem label="Network">{`${event.asn} · ${event.country}`}</MetadataListItem>
              <MetadataListItem label="Session">
                <Link href={`/sessions/${event.sessionId}`}>{event.sessionId}</Link>
              </MetadataListItem>
            </MetadataList>
          </Panel>
          <Panel title="What the sensor captured">
            <Text type="code">{event.summary}</Text>
            <MetadataList label={{ position: 'start', width: 104 }}>
              {event.username && <MetadataListItem label="Username">{event.username}</MetadataListItem>}
              {event.password && <MetadataListItem label="Password">{event.password}</MetadataListItem>}
              {event.command && (
                <MetadataListItem label="Command">
                  <Text type="code">{event.command}</Text>
                </MetadataListItem>
              )}
            </MetadataList>
            {hashes.length > 0 && (
              <VStack gap={1}>
                <Text weight="semibold">Hashes in this event</Text>
                {hashes.map((hash) => (
                  <Text key={hash} type="code">
                    {hash}
                  </Text>
                ))}
              </VStack>
            )}
          </Panel>
        </Grid>
        <EventsPanel title="The rest of this session" events={session} action={<Link href={`/sessions/${event.sessionId}`}>Full session</Link>} empty="This event is the whole session." />
        <EventsPanel title="The rest of this connection" events={connection} empty="No other event on this connection." />
        <EventsPanel title="What else this source did" events={source} action={<Link href={`/events?ip=${event.srcIp}`}>All events</Link>} empty="Nothing else from this address." />
        <Panel title="The complete record">
          <CodeBlock code={JSON.stringify(event, null, 2)} language="json" maxHeight={400} />
        </Panel>
      </VStack>
    </PageFrame>
  )
}
