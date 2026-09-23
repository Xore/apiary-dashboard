import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute } from '@tanstack/react-router'
import { CountTable, Panel, StatTile } from '#/components/DashboardBlocks'
import { RecordList } from '#/components/RecordList'
import { getAuthEvents } from '#/data/queries'
import type { AuthFailure } from '#/data/types'
import { formatDateTime, formatTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/auth-events')({
  loader: () => getAuthEvents(),
  component: AuthEventsPage,
})

function SourceIp({ ip }: { ip?: string }) {
  return ip ? <Link href={`/events?ip=${ip}`}>{ip}</Link> : <Token label="unattributed" size="sm" />
}

const columns: TableColumn<AuthFailure>[] = [
  { key: 'timestamp', header: 'Time', width: pixel(96), renderCell: (row) => <Text type="supporting">{formatTime(row.timestamp)}</Text> },
  { key: 'type', header: 'Type', width: pixel(176), renderCell: (row) => <Token label={row.type} size="sm" color="orange" /> },
  { key: 'ip', header: 'Source IP', width: pixel(144), renderCell: (row) => <SourceIp ip={row.ip} /> },
  { key: 'error', header: 'Error', width: proportional(2), renderCell: (row) => <Text type="code">{row.error}</Text> },
  { key: 'username', header: 'Username tried', width: pixel(136), renderCell: (row) => row.username ?? '—' },
  { key: 'clientId', header: 'Client', width: pixel(152) },
]

function AuthInspector({ event }: { event: AuthFailure }) {
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center">
        <Token label={event.type} size="sm" color="orange" />
        <Text type="code">{event.error}</Text>
      </HStack>
      <MetadataList label={{ position: 'start', width: 112 }}>
        <MetadataListItem label="Time">{formatDateTime(event.timestamp)}</MetadataListItem>
        <MetadataListItem label="Source IP">
          <SourceIp ip={event.ip} />
        </MetadataListItem>
        <MetadataListItem label="Username tried">{event.username ?? '—'}</MetadataListItem>
        <MetadataListItem label="Client">{event.clientId}</MetadataListItem>
        <MetadataListItem label="Realm">{event.realm}</MetadataListItem>
        <MetadataListItem label="Redirect">
          <Text type="code">{event.redirectUri ?? '—'}</Text>
        </MetadataListItem>
        <MetadataListItem label="User">{event.userId ?? '—'}</MetadataListItem>
        <MetadataListItem label="Event ID">
          <Text type="code">{event.id}</Text>
        </MetadataListItem>
      </MetadataList>
      <Text type="supporting">Recorded redacted: no tokens, codes, or cookies are stored.</Text>
    </VStack>
  )
}

function AuthEventsPage() {
  const data = Route.useLoaderData()
  return (
    <RecordList
      title="Auth-failure events"
      description="Failed logins against Keycloak, across every gateway-fronted app and the dashboard's own sign-in. Redacted: never tokens, codes, or cookies."
      actions={<Text type="supporting">{data.events.length} events</Text>}
      summary={
        <VStack gap={4}>
          <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={4}>
            <StatTile label="Failed logins, 24h" value={data.failed24h} />
          </Grid>
          <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={4}>
            <Panel title="Failures by client, 24h">
              <CountTable header="Client" rows={data.byClient} countHeader="Failures" />
            </Panel>
            <Panel title="Top source IPs, 24h">
              <CountTable header="Source IP" rows={data.topSources} countHeader="Failures" />
            </Panel>
          </Grid>
        </VStack>
      }
      rows={data.events}
      columns={columns}
      getId={(row) => row.id}
      inspectorTitle="Event details"
      renderInspector={(row) => <AuthInspector event={row} />}
      emptyState={{
        title: 'No failed logins recorded yet',
        description: 'auth-events-worker records every rejected credential attempt as it happens.',
      }}
    />
  )
}
