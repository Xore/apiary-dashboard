import { Banner } from '@astryxdesign/core/Banner'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { List, ListItem } from '@astryxdesign/core/List'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute } from '@tanstack/react-router'
import { StatTile } from '#/components/DashboardBlocks'
import { RecordList } from '#/components/RecordList'
import { SeverityToken } from '#/components/SeverityToken'
import { getAgentCampaigns } from '#/data/queries'
import type { AgentCampaign, CampaignEvent, MatchedRule } from '#/data/types'
import { formatDateTime, formatNumber, formatTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/agent-campaigns')({
  validateSearch: (search: Record<string, unknown>): { category?: string } => ({
    category: typeof search.category === 'string' && search.category ? search.category : undefined,
  }),
  loader: () => getAgentCampaigns(),
  component: AgentCampaignsPage,
})

/** `encoded-egress-external` → `Encoded egress external`. */
function categoryLabel(category: string): string {
  const words = category.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const columns: TableColumn<AgentCampaign>[] = [
  { key: 'timestamp', header: 'Detected', width: pixel(96), renderCell: (row) => <Text type="supporting">{formatTime(row.timestamp)}</Text> },
  { key: 'severity', header: 'Severity', width: pixel(96), renderCell: (row) => <SeverityToken severity={row.severity} /> },
  { key: 'id', header: 'Campaign', width: pixel(136), renderCell: (row) => <Text type="code">{row.id}</Text> },
  {
    key: 'categories',
    header: 'Categories',
    width: proportional(3),
    renderCell: (row) => (
      <HStack gap={1} wrap="wrap">
        {row.categories.map((category) => (
          <Token key={category} label={categoryLabel(category)} size="sm" href={`/agent-campaigns?category=${category}`} />
        ))}
      </HStack>
    ),
  },
  { key: 'eventCount', header: 'Events', width: pixel(88), align: 'end', renderCell: (row) => formatNumber(row.eventCount) },
]

/** Where the raw sensor document lives: event ids are only unique within
 * their own index, so both are pinned in the history query. */
function sourceHref(event: CampaignEvent): string {
  return `/history?q=${encodeURIComponent(`_id:"${event.eventId}" AND _index:"${event.sourceIndex}"`)}`
}

function RuleDescription({ rule }: { rule: MatchedRule }) {
  const finalHash = rule.decodeChain.at(-1)?.outputSha256
  return (
    <VStack gap={0.5}>
      <Text type="supporting">
        {rule.trustBoundary} · {rule.reason}
      </Text>
      {finalHash && (
        <Text type="supporting">
          {rule.decodeChain.map((step) => step.transform).join(' → ')} · sha256:{finalHash.slice(0, 16)}…
        </Text>
      )}
    </VStack>
  )
}

function CampaignInspector({ campaign }: { campaign: AgentCampaign }) {
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <SeverityToken severity={campaign.severity} />
        <Text type="code">{campaign.id}</Text>
      </HStack>
      <MetadataList label={{ position: 'start', width: 104 }}>
        <MetadataListItem label="Window">{`${formatDateTime(campaign.start)} → ${formatTime(campaign.end)}`}</MetadataListItem>
        <MetadataListItem label="Events">{formatNumber(campaign.eventCount)}</MetadataListItem>
        <MetadataListItem label="Categories">{campaign.categories.map(categoryLabel).join(', ')}</MetadataListItem>
        <MetadataListItem label="Identifiers">
          <VStack gap={0.5}>
            {campaign.identifiers.map((identifier) => (
              <Text key={identifier} type="code">
                {identifier}
              </Text>
            ))}
          </VStack>
        </MetadataListItem>
      </MetadataList>
      <VStack gap={2}>
        <Heading level={3}>Evidence timeline</Heading>
        <List density="compact" hasDividers>
          {campaign.events.flatMap((event) => {
            const source = (
              <Link href={sourceHref(event)}>source</Link>
            )
            if (event.matchedRules.length === 0) {
              return [
                <ListItem
                  key={event.eventId}
                  label={formatTime(event.timestamp)}
                  description="Correlated into this campaign; no rule matched on its own."
                  endContent={source}
                />,
              ]
            }
            return event.matchedRules.map((rule) => (
              <ListItem
                key={`${event.eventId}-${rule.rule}`}
                label={`${formatTime(event.timestamp)} · ${rule.rule}`}
                description={<RuleDescription rule={rule} />}
                endContent={source}
              />
            ))
          })}
        </List>
        {campaign.eventCount > campaign.events.length && (
          <Text type="supporting">
            Showing {campaign.events.length} of {formatNumber(campaign.eventCount)} events.
          </Text>
        )}
      </VStack>
    </VStack>
  )
}

function AgentCampaignsPage() {
  const campaigns = Route.useLoaderData()
  const { category } = Route.useSearch()

  const counts = new Map<string, number>()
  for (const campaign of campaigns) {
    for (const cat of campaign.categories) counts.set(cat, (counts.get(cat) ?? 0) + 1)
  }
  const tiles = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const rows = category ? campaigns.filter((campaign) => campaign.categories.includes(category)) : campaigns

  return (
    <RecordList
      title="Agent campaigns"
      description="Correlated AI-agent intrusion activity: encoded egress, tool-use fingerprints, and cross-sensor automation patterns."
      actions={
        <>
          <Text type="supporting">
            {category ? `${rows.length} of ${campaigns.length}` : campaigns.length} campaigns
          </Text>
          {category && (
            <Token label={`category: ${categoryLabel(category)}`} size="sm" color="blue" href="/agent-campaigns" description="Clear the category filter" />
          )}
        </>
      }
      summary={
        <VStack gap={4}>
          <Banner
            status="info"
            title="Deterministic scoring"
            description="Every campaign crossed a named trust boundary through a rule in criticality_rules.py, not a model's judgment call."
          />
          <Grid columns={{ minWidth: 180, repeat: 'fit' }} gap={4}>
            {tiles.map(([cat, count]) => (
              <StatTile key={cat} label={categoryLabel(cat)} value={count} caption="campaigns" href={`/agent-campaigns?category=${cat}`} />
            ))}
          </Grid>
        </VStack>
      }
      rows={rows}
      columns={columns}
      getId={(row) => row.id}
      inspectorTitle="Campaign details"
      renderInspector={(row) => <CampaignInspector campaign={row} />}
      emptyState={{
        title: category ? 'No campaigns in this category' : 'No agent campaigns yet',
        description: 'agent-intrusion-worker writes a campaign when correlated events cross a trust boundary.',
      }}
    />
  )
}
