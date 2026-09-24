import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { EntityLink } from '#/components/EntityLink'
import { formatDateTime } from '#/lib/format'

const parent = getRouteApi('/_layout/ml-anomalies/$id')

export const Route = createFileRoute('/_layout/ml-anomalies/$id/event')({
  component: AnomalyEvent,
})

/** The raw event the models scored. */
function AnomalyEvent() {
  const { anomaly: a, event } = parent.useLoaderData()
  if (!event)
    return (
      <Text type="supporting">The source event has aged out of the index.</Text>
    )
  return (
    <Panel
      title="The scored event"
      action={
        <EntityLink kind="event" id={event.id}>
          Open event
        </EntityLink>
      }
    >
      <Text type="code">{event.summary}</Text>
      <MetadataList label={{ position: 'start', width: 112 }}>
        <MetadataListItem label="Time">
          {formatDateTime(event.timestamp)}
        </MetadataListItem>
        <MetadataListItem label="Type">{event.type}</MetadataListItem>
        <MetadataListItem label="Session">
          <EntityLink kind="session" id={event.sessionId} />
        </MetadataListItem>
        <MetadataListItem label="Index">
          <Text type="code">{a.sourceIndex}</Text>
        </MetadataListItem>
      </MetadataList>
    </Panel>
  )
}
