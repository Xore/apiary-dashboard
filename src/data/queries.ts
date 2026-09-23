// The data seam. Route loaders call these functions and nothing else; today
// they resolve mock fixtures, later each becomes a createServerFn call to the
// backend with the same signature.
import { EVENTS, MOCK_USER, PASSWORDS, SENSORS, SOURCES, USERNAMES } from './mock/fixtures'
import {
  ATTACKERS,
  COUNTRY_CENTROIDS,
  CRED_REUSE,
  INFRA_CLUSTERS,
  KILL_CHAIN,
  NETWORK_CAMPAIGNS,
  RECORDINGS,
  REPLAYS,
  SOURCE_PROFILES,
} from './mock/investigate'
import { AGENT_CAMPAIGNS, AUTH_FAILURES, LLM_ANALYSES, ML_ANOMALIES, MODEL_HEALTH, SCORE_TIMELINE } from './mock/monitor'
import { MOCK_NOW, createRng } from './mock/random'
import type {
  AgentCampaign,
  AttackerEntity,
  ClusterKind,
  CredEdge,
  EventFilters,
  EventKind,
  EventType,
  EventsPage,
  InfraCluster,
  KillChainData,
  MapPoint,
  NetworkCampaign,
  Recording,
  Replay,
  SensorDetail,
  SensorSummary,
  SourceProfile,
  AuthEventsData,
  CountRow,
  Disposition,
  LlmAnalysis,
  MlAnomaliesData,
  SemanticSearchResult,
  HoneypotEvent,
  Kpi,
  OverviewData,
  Protocol,
  SessionUser,
  TimeBucket,
} from './types'

const HOUR = 3_600_000

/** Simulated backend latency, e.g. VITE_MOCK_LATENCY_MS=800 to exercise
 * pending states. */
async function mockDelay(): Promise<void> {
  const ms = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 0)
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))
}

function hourIndex(timestamp: string): number {
  return 23 - Math.floor((MOCK_NOW - Date.parse(timestamp)) / HOUR)
}

function hourly(events: HoneypotEvent[]): number[] {
  const counts = new Array<number>(24).fill(0)
  for (const event of events) counts[hourIndex(event.timestamp)] += 1
  return counts
}

function countBy(values: Array<string | undefined>, limit: number): CountRow[] {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (value !== undefined) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ id: label, label, count }))
}

function kpi(id: string, label: string, events: HoneypotEvent[], value = events.length): Kpi {
  // Previous-period value is synthetic: ±35% around the current value.
  const rng = createRng(id.length * 7919 + value)
  return { id, label, value, previous: Math.round(value * (0.65 + rng() * 0.7)), trend: hourly(events) }
}

export async function getSessionUser(): Promise<SessionUser> {
  await mockDelay()
  return MOCK_USER
}

export async function getOverview(): Promise<OverviewData> {
  await mockDelay()
  const logins = EVENTS.filter((e) => e.type === 'login.success')
  const downloads = EVENTS.filter((e) => e.type === 'file.download')
  const firstPerSource = [...new Map(EVENTS.map((e) => [e.srcIp, e])).values()]
  const firstPerSession = [...new Map(EVENTS.map((e) => [e.sessionId, e])).values()]

  const protocolTotals = countBy(EVENTS.map((e) => e.protocol), 8)
  const topProtocols = protocolTotals.slice(0, 5).map((row) => row.label as Protocol)
  const timeline: TimeBucket[] = Array.from({ length: 24 }, (_, i) => ({
    time: new Date(MOCK_NOW - (24 - i) * HOUR).toISOString(),
    total: 0,
    byProtocol: {},
  }))
  for (const event of EVENTS) {
    const bucket = timeline[hourIndex(event.timestamp)]
    bucket.total += 1
    bucket.byProtocol[event.protocol] = (bucket.byProtocol[event.protocol] ?? 0) + 1
  }

  return {
    generatedAt: new Date(MOCK_NOW).toISOString(),
    kpis: [
      kpi('events', 'Events', EVENTS),
      kpi('sources', 'Unique sources', firstPerSource),
      kpi('sessions', 'Sessions', firstPerSession),
      kpi('logins', 'Successful logins', logins),
      kpi('payloads', 'Payloads captured', downloads),
    ],
    timeline,
    topProtocols,
    topSources: [...SOURCES].sort((a, b) => b.events - a.events).slice(0, 8),
    topCountries: countBy(EVENTS.map((e) => e.country), 8),
    topUsernames: countBy(EVENTS.map((e) => e.username), USERNAMES.length).slice(0, 8),
    topPasswords: countBy(EVENTS.map((e) => e.password), PASSWORDS.length).slice(0, 8),
    recentEvents: EVENTS.slice(0, 12),
    sensors: SENSORS,
  }
}

// ---- Monitor ---------------------------------------------------------------

const DAY = 24 * HOUR
const within24h = (timestamp: string) => MOCK_NOW - Date.parse(timestamp) < DAY

export async function getMlAnomalies(): Promise<MlAnomaliesData> {
  await mockDelay()
  const recent = ML_ANOMALIES.filter((a) => within24h(a.timestamp))
  return {
    anomalies: ML_ANOMALIES.map((a) => ({ ...a })),
    total24h: recent.reduce((sum, a) => sum + a.folded, 0),
    openBacklog: ML_ANOMALIES.filter((a) => a.status === 'open').reduce((sum, a) => sum + a.folded, 0),
    // Folded rows stand for several anomalies, so every breakdown counts them
    // at full weight and the tiles add up to the 24h total.
    bySeverity: countBy(recent.flatMap((a) => Array<string>(a.folded).fill(a.severity)), 5),
    topSources: countBy(recent.flatMap((a) => (a.srcIp ? Array<string>(a.folded).fill(a.srcIp) : [])), 10),
    eventTypes: [...new Set(ML_ANOMALIES.map((a) => a.eventType))].sort(),
    scoreTimeline: SCORE_TIMELINE,
    modelHealth: MODEL_HEALTH,
  }
}

/** Mock write: marks anomalies acknowledged ("seen, no verdict"). */
export async function acknowledgeAnomalies(ids: string[]): Promise<number> {
  await mockDelay()
  let changed = 0
  for (const anomaly of ML_ANOMALIES) {
    if (ids.includes(anomaly.id) && anomaly.status === 'open') {
      anomaly.status = 'acknowledged'
      changed += 1
    }
  }
  return changed
}

export async function acknowledgeAllAnomalies(): Promise<number> {
  return acknowledgeAnomalies(ML_ANOMALIES.filter((a) => a.status === 'open').map((a) => a.id))
}

/** Mock write: records (or with 'open', retracts) an operator verdict. */
export async function setAnomalyDisposition(ids: string[], status: Disposition | 'open', reason: string): Promise<void> {
  await mockDelay()
  for (const anomaly of ML_ANOMALIES) {
    if (!ids.includes(anomaly.id)) continue
    anomaly.status = status
    anomaly.dispositionReason = status === 'open' ? undefined : reason || undefined
  }
}

export async function getLlmAnalyses(): Promise<LlmAnalysis[]> {
  await mockDelay()
  return LLM_ANALYSES
}

/** Mock semantic search: ranks session summaries by word overlap. */
export async function semanticSearch(query: string): Promise<SemanticSearchResult> {
  await mockDelay()
  const words = new Set(query.toLowerCase().split(/\W+/).filter((w) => w.length > 2))
  if (words.size === 0) return { available: true, hits: [] }
  const hits = LLM_ANALYSES.filter((a) => a.docType === 'session' && a.summary)
    .map((a) => {
      // Summary hits count double; intent/behavior tags count once.
      const summary = a.summary.toLowerCase()
      const tags = `${a.intent} ${a.behaviors.join(' ')}`.toLowerCase()
      const points = [...words].reduce((sum, w) => sum + (summary.includes(w) ? 2 : 0) + (tags.includes(w) ? 1 : 0), 0)
      return { id: a.id, score: points / (3 * words.size), severity: a.severity, summary: a.summary, sessionId: a.sessionId }
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
  return { available: true, hits }
}

export async function getAgentCampaigns(): Promise<AgentCampaign[]> {
  await mockDelay()
  return AGENT_CAMPAIGNS
}

export async function getAuthEvents(): Promise<AuthEventsData> {
  await mockDelay()
  const recent = AUTH_FAILURES.filter((e) => within24h(e.timestamp))
  return {
    events: AUTH_FAILURES,
    failed24h: recent.length,
    byClient: countBy(recent.map((e) => e.clientId), 10),
    topSources: countBy(recent.map((e) => e.ip), 10),
  }
}

// ---- Investigate -----------------------------------------------------------

const KIND_TYPES: Record<EventKind, EventType[]> = {
  connection: ['connection'],
  login: ['login.failed', 'login.success'],
  command: ['command.input'],
  download: ['file.download'],
  http: ['http.request'],
  alert: ['ids.alert'],
}

/** `30m`, `6h`, `7d` → milliseconds; anything else → no window. */
function sinceMs(since?: string): number | undefined {
  const match = since?.match(/^(\d+)([mhd])$/)
  if (!match) return undefined
  return Number(match[1]) * { m: 60_000, h: HOUR, d: DAY }[match[2] as 'm' | 'h' | 'd']
}

export async function getEvents(filters: EventFilters): Promise<EventsPage> {
  await mockDelay()
  const window = sinceMs(filters.since)
  const rows = EVENTS.filter(
    (e) =>
      (!filters.ip || e.srcIp === filters.ip) &&
      (!filters.sensor || e.sensor === filters.sensor) &&
      (!filters.country || e.country === filters.country) &&
      (!filters.proto || e.protocol === filters.proto) &&
      (!filters.port || e.dstPort === filters.port) &&
      (!filters.kind || KIND_TYPES[filters.kind].includes(e.type)) &&
      (window === undefined || MOCK_NOW - Date.parse(e.timestamp) <= window),
  )
  return {
    rows,
    total: rows.length,
    values: {
      sensors: SENSORS.map((s) => s.id),
      countries: [...new Set(EVENTS.map((e) => e.country))].sort(),
      protos: [...new Set(EVENTS.map((e) => e.protocol))].sort(),
      ports: [...new Set(EVENTS.map((e) => e.dstPort))].sort((a, b) => a - b),
    },
  }
}

export async function getSourceProfiles(): Promise<{ sources: SourceProfile[]; mapPoints: MapPoint[] }> {
  await mockDelay()
  const byCountry = countBy(EVENTS.map((e) => e.country), 50)
  const mapPoints = byCountry.flatMap((row) => {
    const centroid = COUNTRY_CENTROIDS[row.label] as [number, number] | undefined
    return centroid ? [{ country: row.label, lat: centroid[0], lon: centroid[1], events: row.count }] : []
  })
  return { sources: SOURCE_PROFILES, mapPoints }
}

export async function getNetworkCampaigns(): Promise<{ campaigns: NetworkCampaign[]; credReuse: CredEdge[] }> {
  await mockDelay()
  return { campaigns: NETWORK_CAMPAIGNS, credReuse: CRED_REUSE }
}

export async function getInfraClusters(): Promise<InfraCluster[]> {
  await mockDelay()
  return INFRA_CLUSTERS
}

export async function getAttackers(): Promise<AttackerEntity[]> {
  await mockDelay()
  return ATTACKERS
}

export async function getKillChain(): Promise<KillChainData> {
  await mockDelay()
  return KILL_CHAIN
}

export async function getCommands(): Promise<HoneypotEvent[]> {
  await mockDelay()
  return EVENTS.filter((e) => e.type === 'command.input')
}

/** Sensors ordered busiest first. */
export async function getSensorCatalog(): Promise<SensorSummary[]> {
  await mockDelay()
  return [...SENSORS].sort((a, b) => b.eventsLast24h - a.eventsLast24h).map((s) => ({ sensor: s.id, events: s.eventsLast24h }))
}

export async function getSensorDetail(id: string): Promise<SensorDetail | null> {
  await mockDelay()
  const sensor = SENSORS.find((s) => s.id === id)
  if (!sensor) return null
  const events = EVENTS.filter((e) => e.sensor === id)
  const timeline: TimeBucket[] = Array.from({ length: 24 }, (_, i) => ({
    time: new Date(MOCK_NOW - (24 - i) * HOUR).toISOString(),
    total: 0,
    byProtocol: {},
  }))
  for (const event of events) {
    const bucket = timeline[hourIndex(event.timestamp)]
    bucket.total += 1
    bucket.byProtocol[event.protocol] = (bucket.byProtocol[event.protocol] ?? 0) + 1
  }
  return {
    sensor,
    uniqueSources: new Set(events.map((e) => e.srcIp)).size,
    timeline,
    topSources: countBy(events.map((e) => e.srcIp), 10),
    byType: countBy(events.map((e) => e.type), 10),
    recentEvents: events.slice(0, 15),
  }
}

export async function getRecordings(ip?: string): Promise<Recording[]> {
  await mockDelay()
  return ip ? RECORDINGS.filter((r) => r.srcIp === ip) : RECORDINGS
}

export async function getReplay(shasum: string): Promise<Replay | null> {
  await mockDelay()
  return REPLAYS.get(shasum) ?? null
}

export type LookupTarget =
  | { kind: 'ip' | 'cidr'; value: string }
  | { kind: 'cluster'; clusterKind: ClusterKind; value: string }
  | { kind: 'not-found'; value: string }

/** Resolves a hex value to the cluster kind that knows it. */
export async function resolveHash(value: string): Promise<LookupTarget> {
  await mockDelay()
  const hit = INFRA_CLUSTERS.find(
    (c) => (c.kind === 'payload' || c.kind === 'fingerprint') && c.value.toLowerCase().replace(/^hassh:/, '') === value,
  )
  return hit ? { kind: 'cluster', clusterKind: hit.kind, value: hit.value } : { kind: 'not-found', value }
}
