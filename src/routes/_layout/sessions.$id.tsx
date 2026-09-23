import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { MiniTable, StatTile } from '#/components/DashboardBlocks'
import { EventsPanel, TechniquesPanel } from '#/components/DetailBlocks'
import { NotFound } from '#/components/NotFound'
import { PageFrame } from '#/components/PageFrame'
import { getSessionDetail } from '#/data/queries'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/sessions/$id')({
  loader: async ({ params }) => {
    const detail = await getSessionDetail(params.id)
    if (!detail) throw notFound()
    return detail
  },
  notFoundComponent: () => <NotFound title="Session" description="No events found for this session id in the current window." />,
  component: SessionPage,
})

function SessionPage() {
  const s = Route.useLoaderData()
  const minutes = Math.max(1, Math.round((Date.parse(s.last) - Date.parse(s.first)) / 60_000))

  return (
    <PageFrame
      title={`Session ${s.id}`}
      description="Everything this attacker session did, in order: commands, credentials, payloads, and the behavior they map to."
      actions={
        <HStack gap={2} vAlign="center">
          <Token size="sm" label={s.country} />
          <Link href={`/investigate/ip/${s.srcIp}`}>{s.srcIp}</Link>
          {s.recordingShasum && <Link href={`/tty-replay/${s.recordingShasum}`}>Replay recording</Link>}
        </HStack>
      }
    >
      <VStack gap={5}>
        <Grid columns={{ minWidth: 180, repeat: 'fit' }} gap={4}>
          <StatTile label="Events" value={s.events.length} />
          <StatTile label="Minutes" value={minutes} caption={`${formatDateTime(s.first)} →`} />
          <StatTile label="Commands" value={s.commands.reduce((n, r) => n + r.count, 0)} />
          <StatTile label="Credentials tried" value={s.credentials.reduce((n, r) => n + r.count, 0)} />
        </Grid>
        <TechniquesPanel techniques={s.techniques} />
        <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={4}>
          <MiniTable title="Sensors" header="Sensor" rows={s.sensors} linkTo={(sensor) => `/sensors/${sensor}`} />
          <MiniTable title="Commands" header="Command" rows={s.commands} isCode />
          <MiniTable title="Credentials" header="Pair" rows={s.credentials} isCode />
          <MiniTable title="Payloads" header="Download" rows={s.payloads} isCode />
        </Grid>
        <EventsPanel title="Every event, newest first" events={s.events} />
      </VStack>
    </PageFrame>
  )
}
