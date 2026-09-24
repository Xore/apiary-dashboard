import { Grid } from '@astryxdesign/core/Grid'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { VStack } from '@astryxdesign/core/Stack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { EntityLink } from '#/components/EntityLink'
import { getSourceNetwork } from '#/data/queries'
import type { SourceProfile } from '#/data/types'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/sources/$ip/network')({
  loader: ({ params }) => getSourceNetwork(params.ip),
  component: SourceNetworkTab,
})

const neighbourColumns: TableColumn<SourceProfile>[] = [
  { key: 'ip', header: 'Address', width: pixel(152), renderCell: (row) => <EntityLink kind="source" id={row.ip} /> },
  { key: 'events', header: 'Events', width: pixel(80), align: 'end' },
  { key: 'sessions', header: 'Sessions', width: pixel(88), align: 'end' },
  { key: 'sensors', header: 'Sensors', width: proportional(2), renderCell: (row) => row.sensors.join(' ') },
  { key: 'last', header: 'Last seen', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.last)}</Text> },
]

function SourceNetworkTab() {
  const net = Route.useLoaderData()
  if (!net) return <Text type="supporting">No network data for this address.</Text>
  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={4}>
        <Panel title="Network">
          <MetadataList>
            <MetadataListItem label="Prefix">
              <EntityLink kind="network" id={net.cidr} />
            </MetadataListItem>
            <MetadataListItem label="Autonomous system">
              <EntityLink kind="asn" id={net.asn}>{`${net.asn} · ${net.org}`}</EntityLink>
            </MetadataListItem>
            <MetadataListItem label="Country">
              <EntityLink kind="country" id={net.country} />
            </MetadataListItem>
          </MetadataList>
        </Panel>
        <Panel title="Campaign">
          {net.campaign ? (
            <VStack gap={2}>
              <EntityLink kind="campaign" id={net.campaign.cidr}>{`Campaign ${net.campaign.cidr} · score ${net.campaign.score}`}</EntityLink>
              <Text color="secondary">{net.campaign.explanation}</Text>
              <Text type="supporting">
                {formatNumber(net.campaign.events)} events from {formatNumber(net.campaign.uniqueIps)} addresses across {net.campaign.sensors.length} sensors.
              </Text>
            </VStack>
          ) : (
            <Text type="supporting">This prefix is not part of a detected campaign.</Text>
          )}
        </Panel>
      </Grid>
      <Panel title={`Neighbours in ${net.cidr} (${net.neighbours.length})`}>
        {net.neighbours.length ? (
          <Table data={net.neighbours} columns={neighbourColumns} idKey="ip" density="compact" />
        ) : (
          <Text type="supporting">No other address in this prefix reached a sensor.</Text>
        )}
      </Panel>
    </VStack>
  )
}
