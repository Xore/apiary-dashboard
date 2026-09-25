import { useState } from 'react'
import { virusTotalLink } from '#/lib/toolLinks'
import { OpenInMenu } from '#/components/OpenInMenu'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute } from '@tanstack/react-router'
import { Histogram, ProtocolTimeline, RankBars, SensorHeatmap, SeriesLines } from '#/components/charts'
import { CountTable, MiniTable, Panel, StatTile } from '#/components/DashboardBlocks'
import { FeedStateLabel } from '#/components/FeedState'
import { PageFrame } from '#/components/PageFrame'
import { SeverityToken } from '#/components/SeverityToken'
import { BugAntIcon, ChartBarIcon, CpuChipIcon, FingerPrintIcon, KeyIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { searchTabs, sectionOf } from '#/components/ViewTabs'
import { WorldMap } from '#/components/WorldMap'
import { getOverview, getOverviewViews } from '#/data/queries'
import type { CapturedPayload, HoneypotEvent, NetworkCampaign, OverviewViews, SensorFeed } from '#/data/types'
import { formatClock, formatDateTime, formatNumber, formatTime } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'
import { FilterSelect } from '#/components/FilterSelect'
import { useLiveRefresh } from '#/lib/live'
import { useShellConfig } from '#/lib/session'
import { ZoneHeader } from '#/components/ZoneHeader'
import { usePreferences } from '#/lib/prefs'

const THREAT_SECTIONS = [
  { id: 'who', label: 'Who', icon: UserGroupIcon },
  { id: 'traffic', label: 'Traffic', icon: ChartBarIcon },
  { id: 'exploits', label: 'Exploits', icon: BugAntIcon },
] as const

const BEHAVIOR_SECTIONS = [
  { id: 'input', label: 'Credentials & commands', icon: KeyIcon },
  { id: 'fingerprints', label: 'Fingerprints', icon: FingerPrintIcon },
  { id: 'decoys', label: 'Decoys & ICS', icon: CpuChipIcon },
] as const

// Views with sections show them as a menu under the view's top-bar entry.
const VIEWS = [
  { id: 'live', label: 'Live operations' },
  { id: 'health', label: 'Collection health' },
  { id: 'threats', label: 'Threat landscape', sections: THREAT_SECTIONS },
  { id: 'behavior', label: 'Attacker behavior', sections: BEHAVIOR_SECTIONS },
  { id: 'evidence', label: 'Evidence & campaigns' },
] as const
type View = (typeof VIEWS)[number]['id']

export const Route = createFileRoute('/_layout/')({
  staticData: { viewTabs: searchTabs({ label: 'Dashboard views', param: 'view', tabs: () => [...VIEWS] }) },
  validateSearch: (search: Record<string, unknown>): { view?: View; section?: string } => ({
    view: VIEWS.some((v) => v.id === search.view) && search.view !== 'live' ? (search.view as View) : undefined,
    section: typeof search.section === 'string' && search.section ? search.section : undefined,
  }),
  loader: async () => {
    const [overview, views] = await Promise.all([getOverview(), getOverviewViews()])
    return { overview, views }
  },
  component: OverviewPage,
})

const formatBytes = (bytes: number) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`)
const ipLink = (ip: string) => `/sources/${ip}`

// ---- Live operations ---------------------------------------------------------

const eventColumns: TableColumn<HoneypotEvent>[] = [
  { key: 'timestamp', header: <ZoneHeader label="Time" />, width: pixel(128), renderCell: (row) => <Text type="supporting">{formatClock(row.timestamp)}</Text> },
  { key: 'severity', header: 'Severity', width: pixel(96), renderCell: (row) => <SeverityToken severity={row.severity} /> },
  { key: 'sensor', header: 'Sensor', width: pixel(140) },
  { key: 'srcIp', header: 'Source', width: pixel(150), renderCell: (row) => <HStack gap={1.5} vAlign="center"><Link href={ipLink(row.srcIp)}>{row.srcIp}</Link><Text type="supporting">{row.country}</Text></HStack> },
  { key: 'dstPort', header: 'Port', width: pixel(96), renderCell: (row) => `${row.dstPort}/${row.protocol}` },
  { key: 'summary', header: 'Detail', width: proportional(3), renderCell: (row) => <EntityLink kind="event" id={row.id}><Text type="code">{row.summary}</Text></EntityLink> },
]

function AttackVectorsPanel({ views }: { views: OverviewViews }) {
  const sensors = Object.keys(views.vectors).filter((s) => !s.startsWith('suricata'))
  const [sensor, setSensor] = useState(sensors[0])
  const vectors = views.vectors[sensor] as OverviewViews['vectors'][string] | undefined
  return (
    <Panel
      title="Attack vectors"
      action={
        <FilterSelect
          label="Sensor drill-down"
          isLabelHidden
          size="sm"
          width={200}
          mode="single"
          options={sensors.map((s) => ({ value: s }))}
          value={[sensor]}
          onChange={([next]) => next && setSensor(next)}
        />
      }
    >
      {vectors && (
        <Grid columns={{ minWidth: 240, repeat: 'fit' }} gap={4}>
          <VStack gap={2}>
            <Text type="supporting">Targeted ports, {sensor}, last 24h</Text>
            <CountTable header="Port" rows={vectors.ports} linkTo={(port) => `/events?sensor=${sensor}&port=${port}`} />
          </VStack>
          <VStack gap={2}>
            <Text type="supporting">Protocols, {sensor}, last 24h</Text>
            <CountTable header="Protocol" rows={vectors.protocols} linkTo={(proto) => `/events?sensor=${sensor}&proto=${proto}`} />
          </VStack>
        </Grid>
      )}
    </Panel>
  )
}

function LiveView({ views, recent, timeline, start }: { views: OverviewViews; recent: HoneypotEvent[]; timeline: Parameters<typeof ProtocolTimeline>[0]['buckets']; start: string }) {
  return (
    <VStack gap={4}>
      <Panel title="Activity, last 24h" action={<Link href="/events">Event explorer</Link>}>
        <SensorHeatmap rows={views.heatmap} startIso={start} />
      </Panel>
      <Grid columns={{ minWidth: 420, repeat: 'fit' }} gap={4}>
        <Panel title="Events by protocol">
          <ProtocolTimeline buckets={timeline} />
        </Panel>
        <AttackVectorsPanel views={views} />
      </Grid>
      <Panel title="Attack origins" action={<Link href="/ips">Attack sources</Link>}>
        <WorldMap points={views.mapPoints} />
      </Panel>
      <Panel title="Recent events" action={<Link href="/events">All events</Link>}>
        <Table data={recent} columns={eventColumns} idKey="id" density="compact" textOverflow="truncate" hasHover />
      </Panel>
    </VStack>
  )
}

// ---- Collection health -------------------------------------------------------

const feedColumns: TableColumn<SensorFeed>[] = [
  { key: 'sensor', header: 'Sensor', width: proportional(2), renderCell: (row) => <EntityLink kind="sensor" id={row.sensor} /> },
  { key: 'state', header: 'State', width: pixel(120), renderCell: (row) => <FeedStateLabel state={row.state} /> },
  { key: 'documents', header: 'Documents', width: pixel(104), align: 'end', renderCell: (row) => formatNumber(row.documents) },
  { key: 'lastSeen', header: 'Last event', width: pixel(96), renderCell: (row) => <Text type="supporting">{formatTime(row.lastSeen)}</Text> },
]

function HealthView({ views }: { views: OverviewViews }) {
  const showMl = useShellConfig().behavior.showMlPanels
  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 420, repeat: 'fit' }} gap={4}>
        <Panel title="Sensor feeds" action={<Link href="/source-health">Source & pipeline health</Link>}>
          <Table data={views.feeds} columns={feedColumns} idKey="sensor" density="compact" />
        </Panel>
        <MiniTable title="Protocols probed" header="Protocol" rows={views.protocols} linkTo={(p) => `/events?proto=${p}`} />
      </Grid>
      {showMl && (
        <Panel title="ML classification backlog, last 7 days" action={<Link href="/ml-anomalies">ML anomalies</Link>}>
          <SeriesLines data={views.mlBacklog} series={[{ key: 'classified', label: 'Classified' }, { key: 'pending', label: 'Pending' }]} dayTicks />
        </Panel>
      )}
    </VStack>
  )
}

// ---- Threat landscape --------------------------------------------------------

function ThreatsView({ views, section }: { views: OverviewViews; section?: string }) {
  const current = sectionOf(THREAT_SECTIONS, section)
  return (
    <VStack gap={4}>
      {current === 'who' && (
        <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
          <MiniTable title="Top source IPs" header="Source" rows={views.topIps} linkTo={ipLink} />
          <MiniTable title="Top targeted ports" header="Port" rows={views.topPorts} linkTo={(p) => `/events?port=${p}`} />
          <MiniTable title="Top countries" header="Country" rows={views.countries} linkTo={(c) => `/events?country=${c}`} />
          <MiniTable title="Top autonomous systems" header="ASN" rows={views.asns} />
          <MiniTable title="Network/provider classes" header="Class" rows={views.providers} />
        </Grid>
      )}
      {current === 'traffic' && (
        <VStack gap={4}>
          <Grid columns={{ minWidth: 420, repeat: 'fit' }} gap={4}>
            <Panel title="Traffic volume, bytes/hour, last 7 days">
              <SeriesLines data={views.netflowBytes} series={[{ key: 'bytes', label: 'Bytes' }]} format={formatBytes} dayTicks />
            </Panel>
            <Panel title="Traffic volume, packets/hour, last 7 days">
              <SeriesLines data={views.netflowPackets} series={[{ key: 'packets', label: 'Packets' }]} dayTicks />
            </Panel>
          </Grid>
          <Panel title="Protocol-conformance violations by protocol">
            <SeriesLines data={views.conformance} series={[{ key: 'http', label: 'HTTP' }, { key: 'smb', label: 'SMB' }, { key: 'sip', label: 'SIP' }]} dayTicks />
          </Panel>
        </VStack>
      )}
      {current === 'exploits' && (
        <Panel title="Top exploited CVEs / named incidents, last 7 days" action={<Link href="/iocs?kind=cve">All CVEs</Link>}>
          <RankBars rows={views.cves} />
        </Panel>
      )}
    </VStack>
  )
}

// ---- Attacker behavior -------------------------------------------------------

const FINGERPRINT_BARS: Array<[string, keyof OverviewViews]> = [
  ['Attacker OS distribution', 'osDistribution'],
  ['Attacker TCP-stack clusters (JA4T)', 'tcpClusters'],
  ['TLS scanner fingerprints (JA4), wire-level, last 7 days', 'tls'],
  ['SSH client software, wire-level, last 7 days', 'ssh'],
  ['HTTP client fingerprints (JA4H), last 7 days', 'ja4h'],
  ['Connection-latency fingerprints (JA4L), last 7 days', 'ja4l'],
  ['Certificate construction fingerprints (JA4X), last 7 days', 'ja4x'],
]
const DECOY_BARS: Array<[string, keyof OverviewViews]> = [
  ['Decoy requests (TLS-terminated), last 7 days', 'decoyRequests'],
  ['Who reached the decoys (JA4)', 'decoyClients'],
  ['ICS function codes: what they asked the PLCs to do', 'icsFunctions'],
]

function Bars({ views, bars }: { views: OverviewViews; bars: Array<[string, keyof OverviewViews]> }) {
  return (
    <Grid columns={{ minWidth: 520, repeat: 'fit' }} gap={4}>
      {bars.map(([title, key]) => (
        <Panel key={key} title={title}>
          <RankBars rows={views[key] as OverviewViews['cves']} />
        </Panel>
      ))}
    </Grid>
  )
}

function BehaviorView({ views, section }: { views: OverviewViews; section?: string }) {
  const current = sectionOf(BEHAVIOR_SECTIONS, section)
  return (
    <VStack gap={4}>
      {current === 'input' && (
        <Grid columns={{ minWidth: 340, repeat: 'fit' }} gap={4}>
          <MiniTable title="Top credentials (user / pass)" header="Pair" rows={views.credentials} isCode />
          <MiniTable title="Top commands" header="Command" rows={views.commands} isCode />
          <MiniTable title="Top HTTP paths" header="Path" rows={views.paths} isCode />
          <MiniTable title="SSH/telnet clients" header="Banner" rows={views.clients} isCode />
        </Grid>
      )}
      {current === 'fingerprints' && (
        <VStack gap={4}>
          <MiniTable title="Top fingerprints (HASSH / JA3 / JA4 / User-Agent)" header="Fingerprint" rows={views.fingerprints} isCode />
          <Bars views={views} bars={FINGERPRINT_BARS} />
        </VStack>
      )}
      {current === 'decoys' && (
        <VStack gap={4}>
          <Bars views={views} bars={DECOY_BARS} />
          <Panel title="Attacker time wasted (endlessh tarpit)">
            <Text type="supporting">How long each tarpitted connection stayed before giving up.</Text>
            <Histogram rows={views.endlessh} />
          </Panel>
        </VStack>
      )}
    </VStack>
  )
}

// ---- Evidence & campaigns ----------------------------------------------------

const payloadColumns: TableColumn<CapturedPayload>[] = [
  { key: 'hash', header: 'SHA-256', width: proportional(2), renderCell: (row) => <EntityLink kind="payload" id={row.hash}><Text type="code">{`${row.hash.slice(0, 20)}…`}</Text></EntityLink> },
  { key: 'kind', header: 'Kind', width: pixel(112) },
  { key: 'sources', header: 'Source', width: pixel(120), renderCell: (row) => row.sources.join(' ') },
  { key: 'copies', header: 'Copies', width: pixel(72), align: 'end' },
  { key: 'verdict', header: 'Verdict', width: pixel(112), renderCell: (row) => (row.verdict ? <Token size="sm" label={row.verdict.family ?? row.verdict.label} color={row.verdict.label === 'malicious' ? 'red' : row.verdict.label === 'suspicious' ? 'orange' : 'green'} /> : '—') },
  { key: 'lookup', header: '', width: pixel(56), renderCell: (row) => <OpenInMenu compact links={[virusTotalLink(row.hash)]} /> },
]

const campaignColumns: TableColumn<NetworkCampaign>[] = [
  { key: 'score', header: 'Score', width: pixel(64), align: 'end' },
  { key: 'cidr', header: 'Network', width: proportional(2), renderCell: (row) => <EntityLink kind="campaign" id={row.cidr} /> },
  { key: 'events', header: 'Events', width: pixel(80), align: 'end', renderCell: (row) => formatNumber(row.events) },
  { key: 'uniqueIps', header: 'IPs', width: pixel(56), align: 'end' },
  { key: 'sensors', header: 'Sensors', width: proportional(2), renderCell: (row) => row.sensors.join(' ') },
]

function EvidenceView({ views }: { views: OverviewViews }) {
  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 420, repeat: 'fit' }} gap={4}>
        <MiniTable title="Suricata alerts" header="Signature" rows={views.alerts} linkTo={(sig) => `/history?q=${encodeURIComponent(sig)}`} />
        <MiniTable title="Alert categories" header="Category" rows={views.alertCategories} />
      </Grid>
      <Panel title="Captured payloads" action={<Link href="/payloads">All payloads</Link>}>
        <Table data={views.payloads} columns={payloadColumns} idKey="hash" density="compact" />
      </Panel>
      <Panel title="Correlated campaigns, rolling 7 days" action={<Link href="/campaigns">All campaigns</Link>}>
        <Table data={views.campaigns} columns={campaignColumns} idKey="cidr" density="compact" />
      </Panel>
    </VStack>
  )
}

// ---- Page --------------------------------------------------------------------

function OverviewPage() {
  const { overview, views } = Route.useLoaderData()
  const { view = 'live', section } = Route.useSearch()
  // The numbers follow the live stream, at most every refresh interval.
  useLiveRefresh((usePreferences()?.refreshSeconds ?? 10) * 1000)
  return (
    <PageFrame title="Overview" description={`Last 24 hours · generated ${formatDateTime(overview.generatedAt)}`}>
      <VStack gap={5}>
        {/* The headline numbers belong to the at-a-glance view; the other
            views are deep dives and start with their own content. */}
        {view === 'live' && (
          <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={4}>
            {overview.kpis.map((kpi) => (
              <StatTile key={kpi.id} {...kpi} caption="Last 24h vs. previous 24h" />
            ))}
          </Grid>
        )}
        {view === 'live' && <LiveView views={views} recent={overview.recentEvents} timeline={overview.timeline} start={overview.timeline.at(0)?.time ?? overview.generatedAt} />}
        {view === 'health' && <HealthView views={views} />}
        {view === 'threats' && <ThreatsView views={views} section={section} />}
        {view === 'behavior' && <BehaviorView views={views} section={section} />}
        {view === 'evidence' && <EvidenceView views={views} />}
      </VStack>
    </PageFrame>
  )
}
