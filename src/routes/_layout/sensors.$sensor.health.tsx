import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import type { FeedState } from '#/data/types'
import { formatDateTime, formatNumber } from '#/lib/format'

const parent = getRouteApi('/_layout/sensors/$sensor')

export const Route = createFileRoute('/_layout/sensors/$sensor/health')({ component: SensorHealth })

const FEED_COLOR = { fresh: 'green', delayed: 'orange', stale: 'orange', silent: 'red' } as const satisfies Record<FeedState, string>

function SensorHealth() {
  const { detail, feed } = parent.useLoaderData()
  return (
    <Panel title="Is its data arriving" action={<Link href="/source-health">Source & pipeline health</Link>}>
      {feed ? (
        <MetadataList label={{ position: 'start', width: 144 }}>
          <MetadataListItem label="Feed">
            <Token size="sm" color={FEED_COLOR[feed.state]} label={feed.state} />
          </MetadataListItem>
          <MetadataListItem label="Indexed documents">{formatNumber(feed.documents)}</MetadataListItem>
          <MetadataListItem label="Last document">{formatDateTime(feed.lastSeen)}</MetadataListItem>
          <MetadataListItem label="Sensor status">{detail.sensor.status}</MetadataListItem>
          <MetadataListItem label="Last event">{formatDateTime(detail.sensor.lastSeen)}</MetadataListItem>
        </MetadataList>
      ) : (
        <Text type="supporting">This sensor has no ingest feed of its own.</Text>
      )}
    </Panel>
  )
}
