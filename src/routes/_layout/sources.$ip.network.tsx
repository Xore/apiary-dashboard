import { Grid } from '@astryxdesign/core/Grid'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { SourcesTable } from '#/components/EntityBlocks'
import { EntityLink } from '#/components/EntityLink'
import { getSourceNetwork } from '#/data/queries'
import { formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/sources/$ip/network')({
  loader: ({ params }) => getSourceNetwork(params.ip),
  component: SourceNetworkTab,
})

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
        <SourcesTable sources={net.neighbours} empty="No other address in this prefix reached a sensor." />
      </Panel>
    </VStack>
  )
}
