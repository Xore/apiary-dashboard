import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Tab, TabList } from '@astryxdesign/core/TabList'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { MiniTable, Panel, StatTile } from '#/components/DashboardBlocks'
import { EventsPanel, TechniquesPanel } from '#/components/DetailBlocks'
import { NotFound } from '#/components/NotFound'
import { PageFrame } from '#/components/PageFrame'
import { getIpProfile, setIpBlocked } from '#/data/queries'
import { formatDateTime } from '#/lib/format'

type ProfileTab = 'activity' | 'indicators' | 'correlation'

export const Route = createFileRoute('/_layout/investigate/ip/$ip')({
  validateSearch: (search: Record<string, unknown>): { tab?: ProfileTab } => ({
    tab: search.tab === 'indicators' || search.tab === 'correlation' ? search.tab : undefined,
  }),
  loader: async ({ params }) => {
    const profile = await getIpProfile(params.ip)
    if (!profile) throw notFound()
    return profile
  },
  notFoundComponent: () => <NotFound title="Attacker profile" description="No events from this address in the current window." />,
  component: IpProfilePage,
})

function BlockControl({ ip, blocked }: { ip: string; blocked: boolean }) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <Button label={blocked ? 'Unblock' : 'Block at portbridge'} size="sm" variant={blocked ? 'secondary' : 'destructive'} onClick={() => setConfirmOpen(true)} />
      <AlertDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={blocked ? `Unblock ${ip}?` : `Block ${ip}?`}
        description={
          blocked
            ? 'Removes the address from the manual blackhole list. New connections reach the sensors again.'
            : 'Drops new connections from this address at portbridge. Nothing already logged is affected.'
        }
        actionLabel={blocked ? 'Unblock' : 'Block'}
        actionVariant={blocked ? 'primary' : 'destructive'}
        isActionLoading={busy}
        onAction={async () => {
          setBusy(true)
          try {
            await setIpBlocked(ip, !blocked)
            await router.invalidate()
          } finally {
            setBusy(false)
            setConfirmOpen(false)
          }
        }}
      />
    </>
  )
}

function IpProfilePage() {
  const p = Route.useLoaderData()
  const { ip } = Route.useParams()
  const { tab = 'activity' } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <PageFrame
      title={ip}
      description="Everything this source address did across every sensor: behavior, credentials, sessions, and raw events."
      actions={
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Token size="sm" color="blue" label={p.source.country} />
          <Token size="sm" label={`${p.source.asn} · ${p.source.org}`} />
          {p.source.tags.map((tag) => (
            <Token key={tag} size="sm" color="orange" label={tag} />
          ))}
          {p.blocked && <Token size="sm" color="red" label="blocked" />}
          <BlockControl ip={ip} blocked={p.blocked} />
        </HStack>
      }
    >
      <VStack gap={5}>
        <Grid columns={{ minWidth: 170, repeat: 'fit' }} gap={4}>
          <StatTile label="Events" value={p.source.events} href={`/events?ip=${ip}`} />
          <StatTile label="Logins" value={p.source.logins} href={`/events?ip=${ip}&kind=login`} />
          <StatTile label="Sessions" value={p.source.sessions} />
          <StatTile label="Risk score" value={p.source.riskScore} />
        </Grid>
        <HStack gap={3} wrap="wrap">
          <Text type="supporting">
            Seen {formatDateTime(p.source.first)} → {formatDateTime(p.source.last)}
          </Text>
          <Link href={`/recordings?ip=${ip}`}>Session recordings</Link>
          {p.attackerId && <Link href="/attackers">Part of attacker identity {p.attackerId.slice(0, 8)}</Link>}
        </HStack>
        <TabList value={tab} onChange={(value) => void navigate({ search: { tab: value === 'activity' ? undefined : (value as ProfileTab) } })} hasDivider>
          <Tab value="activity" label="Activity" />
          <Tab value="indicators" label="Indicators" />
          <Tab value="correlation" label="Correlation & timeline" />
        </TabList>
        {tab === 'activity' && (
          <VStack gap={4}>
            <TechniquesPanel techniques={p.techniques} />
            <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
              <MiniTable title="Sensors contacted" header="Sensor" rows={p.sensors} linkTo={(s) => `/sensors/${s}`} />
              <MiniTable title="Credentials attempted" header="Pair" rows={p.credentials} isCode />
              <MiniTable title="Commands" header="Command" rows={p.commands} isCode />
              <MiniTable title="HTTP paths" header="Path" rows={p.paths} isCode />
              <MiniTable title="Targeted ports" header="Port" rows={p.ports} />
              <MiniTable title="Protocols" header="Protocol" rows={p.protocols} />
              <MiniTable title="Sessions" header="Session" rows={p.sessions} isCode linkTo={(id) => `/sessions/${id}`} />
            </Grid>
          </VStack>
        )}
        {tab === 'indicators' && (
          <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
            <MiniTable title="Payload downloads" header="Download" rows={p.payloads} isCode />
            <MiniTable title="IDS alerts" header="Signature" rows={p.alerts} />
          </Grid>
        )}
        {tab === 'correlation' && (
          <VStack gap={4}>
            <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={4}>
              <StatTile label="Total ES matches" value={p.correlation.totalMatches} />
              <StatTile label="Tunnel connections" value={p.correlation.tunnelConnections} />
              <StatTile label="Distinct sensors" value={p.correlation.distinctSensors} />
            </Grid>
            <Panel title="Elasticsearch correlation">
              <Text color="secondary">
                Honeypot, Suricata, and portbridge tunnel records that mention this address, including ones no sensor
                attributed to a session.
              </Text>
            </Panel>
          </VStack>
        )}
        <EventsPanel title="Newest events" events={p.events.slice(0, 50)} action={<Link href={`/events?ip=${ip}`}>All events</Link>} />
      </VStack>
    </PageFrame>
  )
}
