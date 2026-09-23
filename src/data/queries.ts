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
import {
  CAPE_RUNS,
  GITHUB_ANALYSES,
  REVDECK_RUNS,
  buildGhidraAnalysis,
  buildPayloadAnalysis,
  buildSandboxRun,
  findPayload,
} from './mock/evidence'
import {
  AUDIT_LOG,
  BLOCKED_IPS,
  CONFIG_HISTORY,
  DEAD_LETTERS,
  PREFERENCES,
  PROBLEM_REPORTS,
  SERVICES,
  SETTINGS_ADMIN,
  techniquesFor,
} from './mock/details'
import {
  ALERTS,
  ANALYSIS_RESULTS,
  ANALYZERS,
  BAIT_CREDENTIALS,
  CANARY_TOKENS,
  CANARY_TRIGGERS,
  CANARY_TYPES,
  GENERATED_REPORTS,
  GPU_QUEUE,
  PAYLOADS,
  REPORT_DEFINITIONS,
  REPORT_ELEMENTS,
  REPORT_TEMPLATES,
  SOURCE_HEALTH,
  TOPOLOGY,
} from './mock/operations'
import { AGENT_CAMPAIGNS, AUTH_FAILURES, LLM_ANALYSES, ML_ANOMALIES, MODEL_HEALTH, SCORE_TIMELINE } from './mock/monitor'
import { OVERVIEW_VIEWS } from './mock/overview'
import { sensorReading } from './mock/sensors'
import { MOCK_NOW, createRng } from './mock/random'
import type {
  AgentCampaign,
  CapeRun,
  GhidraAnalysis,
  GithubAnalysis,
  PayloadAnalysis,
  RevDeckRun,
  SandboxRun,
  Correlation,
  DeadLetter,
  EventDetail,
  IpProfile,
  Preferences,
  ProblemReport,
  ProblemStatus,
  ReplayDetail,
  SearchGroup,
  SessionDetail,
  SettingsData,
  AlertGroup,
  AlertRecord,
  AnalysisResult,
  AnalysisResultsData,
  BaitCredential,
  CanaryToken,
  CanaryTokenType,
  CanaryTrigger,
  CapturedPayload,
  GeneratedReport,
  ReportDefinition,
  ReportsData,
  SourceHealth,
  Topology,
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
  OverviewViews,
  Protocol,
  SessionUser,
  TimeBucket,
} from './types'

const HOUR = 3_600_000

/** Simulated backend behavior: VITE_MOCK_LATENCY_MS=800 exercises pending
 * states, VITE_MOCK_FAIL=1 makes every call fail to exercise error states. */
async function mockDelay({ canFail = true } = {}): Promise<void> {
  const ms = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 0)
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))
  if (canFail && import.meta.env.VITE_MOCK_FAIL === '1') throw new Error('Mock backend unavailable (VITE_MOCK_FAIL=1)')
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
  // The session comes from the auth layer, not the data backend; keeping it
  // up lets page errors render inside the shell.
  await mockDelay({ canFail: false })
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
  const reading = sensorReading(sensor, events)
  return {
    sensor,
    uniqueSources: new Set(events.map((e) => e.srcIp)).size,
    firstSeen: SOURCES.map((s) => s.firstSeen).sort()[0],
    timeline,
    measures: reading.measures,
    topSources: countBy(events.map((e) => e.srcIp), 10),
    topCountries: countBy(events.map((e) => e.country), 10),
    topLists: reading.topLists,
    byType: countBy(events.map((e) => e.type), 10),
    recentEvents: events.slice(0, 15),
    requests: reading.requests,
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

// ---- Operations ------------------------------------------------------------

/** Same-class alerts collapse into one row: the kind plus the message with
 * hash-like and dotted-quad tokens blanked. */
function alertClass(alert: AlertRecord): string {
  return `${alert.kind}|${alert.message.replace(/\b[0-9a-f]{16,}\b/gi, '#').replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '#')}`
}

export async function getAlerts(): Promise<AlertGroup[]> {
  await mockDelay()
  const groups = new Map<string, AlertRecord[]>()
  for (const alert of ALERTS) {
    // Acknowledged and open members of one class land in separate groups so
    // each tab shows only its own records.
    const key = `${alertClass(alert)}|${alert.acknowledged}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({ ...alert })
  }
  return [...groups]
    .map(([id, members]) => ({
      id,
      kind: members[0].kind,
      message: members.length > 1 ? members[0].message.replace(/\b[0-9a-f]{16,}\b/gi, '<hash>') : members[0].message,
      severity: members[0].severity,
      count: members.reduce((sum, m) => sum + m.count, 0),
      firstSeen: members.map((m) => m.firstSeen).sort()[0],
      lastSeen: members.map((m) => m.lastSeen).sort().at(-1)!,
      acknowledged: members[0].acknowledged,
      members,
    }))
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
}

/** Mock write: acknowledges (or reopens) the given alert keys. */
export async function setAlertsAcknowledged(keys: string[], acknowledged: boolean): Promise<number> {
  await mockDelay()
  let changed = 0
  for (const alert of ALERTS) {
    if (keys.includes(alert.key) && alert.acknowledged !== acknowledged) {
      alert.acknowledged = acknowledged
      alert.acknowledgedBy = acknowledged ? MOCK_USER.name : undefined
      changed += 1
    }
  }
  return changed
}

export async function acknowledgeAllAlerts(): Promise<number> {
  return setAlertsAcknowledged(ALERTS.filter((a) => !a.acknowledged).map((a) => a.key), true)
}

export async function getSourceHealth(): Promise<SourceHealth> {
  await mockDelay()
  return SOURCE_HEALTH
}

export async function getTopology(): Promise<Topology> {
  await mockDelay()
  return TOPOLOGY
}

const HISTORY_FIELDS: Record<string, (e: HoneypotEvent) => string> = {
  'source.ip': (e) => e.srcIp,
  ip: (e) => e.srcIp,
  sensor: (e) => e.sensor,
  'honeypot.event': (e) => e.type,
  event: (e) => e.type,
  protocol: (e) => e.protocol,
  port: (e) => String(e.dstPort),
  country: (e) => e.country,
  session: (e) => e.sessionId,
  username: (e) => e.username ?? '',
}

/** Mock of the archive's Lucene passthrough: `field:value` terms and free
 * text, joined with AND. Unknown fields match nothing. */
export async function searchHistory(query: string): Promise<HoneypotEvent[]> {
  await mockDelay()
  const terms = query
    .split(/\s+AND\s+/i)
    .map((t) => t.trim())
    .filter(Boolean)
  return EVENTS.filter((event) =>
    terms.every((term) => {
      const match = term.match(/^([\w.]+):"?([^"]*)"?$/)
      if (match) {
        const field = HISTORY_FIELDS[match[1]] as ((e: HoneypotEvent) => string) | undefined
        return field ? field(event).toLowerCase().includes(match[2].toLowerCase()) : false
      }
      return JSON.stringify(event).toLowerCase().includes(term.toLowerCase())
    }),
  ).slice(0, 500)
}

// ---- Reports ---------------------------------------------------------------

export async function getReports(): Promise<ReportsData> {
  await mockDelay()
  return {
    templates: REPORT_TEMPLATES,
    elements: REPORT_ELEMENTS,
    definitions: REPORT_DEFINITIONS.map((d) => structuredClone(d)),
    generated: [...GENERATED_REPORTS],
  }
}

/** Mock write: creates (empty id) or replaces a definition. */
export async function saveReportDefinition(definition: ReportDefinition): Promise<ReportDefinition> {
  await mockDelay()
  const saved = { ...structuredClone(definition), id: definition.id || `def-${Date.now().toString(36)}`, created: definition.created || new Date(MOCK_NOW).toISOString() }
  const index = REPORT_DEFINITIONS.findIndex((d) => d.id === saved.id)
  if (index >= 0) REPORT_DEFINITIONS[index] = saved
  else REPORT_DEFINITIONS.unshift(saved)
  return saved
}

export async function deleteReportDefinition(id: string): Promise<void> {
  await mockDelay()
  const index = REPORT_DEFINITIONS.findIndex((d) => d.id === id)
  if (index >= 0) REPORT_DEFINITIONS.splice(index, 1)
}

export async function generateReport(definitionId: string): Promise<GeneratedReport | null> {
  await mockDelay()
  const definition = REPORT_DEFINITIONS.find((d) => d.id === definitionId)
  if (!definition) return null
  const report: GeneratedReport = {
    id: `rpt-${Date.now().toString(36)}`,
    title: definition.branding.title || definition.name,
    template: definition.template,
    origin: 'manual',
    createdAt: new Date(MOCK_NOW).toISOString(),
    sizeBytes: 200 * 1024 + definition.elements.length * 90 * 1024,
    definitionId,
  }
  GENERATED_REPORTS.unshift(report)
  return report
}

export async function deleteGeneratedReport(id: string): Promise<void> {
  await mockDelay()
  const index = GENERATED_REPORTS.findIndex((r) => r.id === id)
  if (index >= 0) GENERATED_REPORTS.splice(index, 1)
}

// ---- Tools -----------------------------------------------------------------

export async function getCanarytokens(): Promise<{ types: CanaryTokenType[]; tokens: CanaryToken[]; triggers: CanaryTrigger[] }> {
  await mockDelay()
  return { types: CANARY_TYPES, tokens: [...CANARY_TOKENS], triggers: CANARY_TRIGGERS }
}

/** Mock write: mints a token as the self-hosted Canarytokens platform would. */
export async function createCanarytoken(input: { type: string; memo: string; text?: string }): Promise<CanaryToken> {
  await mockDelay()
  const id = Array.from(crypto.getRandomValues(new Uint8Array(13)), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 25)
  const token: CanaryToken = {
    id,
    type: input.type,
    memo: input.memo,
    url: `http://canary.example.test/tags/${id}/index.html`,
    hostname: `${id}.canary.example.test`,
    createdAt: new Date(MOCK_NOW).toISOString(),
    createdBy: MOCK_USER.name,
    artifact: ['aws_keys', 'kubeconfig', 'ms_word', 'pdf', 'qr_code'].includes(input.type) ? `${input.type}-${id.slice(0, 6)}` : undefined,
  }
  CANARY_TOKENS.unshift(token)
  return token
}

// Visually unambiguous alphabet (no 0/O, 1/l/I).
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%^&*'

export function generatePassword(length = 16): string {
  return Array.from(crypto.getRandomValues(new Uint32Array(length)), (n) => PASSWORD_ALPHABET[n % PASSWORD_ALPHABET.length]).join('')
}

export async function getCredentials(): Promise<{ credentials: BaitCredential[]; tokens: CanaryToken[]; targets: string[] }> {
  await mockDelay()
  return {
    credentials: BAIT_CREDENTIALS.map((c) => ({ ...c })),
    tokens: CANARY_TOKENS,
    targets: SENSORS.filter((s) => s.kind === 'Cowrie').map((s) => s.id),
  }
}

/** Mock write: provisioning implants the file immediately (not a draft). */
export async function provisionCredential(input: Pick<BaitCredential, 'path' | 'target' | 'username' | 'password' | 'memo' | 'template'>): Promise<BaitCredential> {
  await mockDelay()
  const credential: BaitCredential = {
    ...input,
    template: input.template || 'username={{username}}\npassword={{password}}',
    id: `cred-${Date.now().toString(36)}`,
    createdAt: new Date(MOCK_NOW).toISOString(),
    createdBy: MOCK_USER.name,
  }
  BAIT_CREDENTIALS.unshift(credential)
  return credential
}

export async function rotateCredential(id: string, password?: string): Promise<void> {
  await mockDelay()
  const credential = BAIT_CREDENTIALS.find((c) => c.id === id)
  if (!credential) return
  credential.password = password || generatePassword()
  credential.rotatedAt = new Date(MOCK_NOW).toISOString()
  credential.rotatedBy = MOCK_USER.name
}

export async function linkCredentialToken(id: string, tokenId?: string): Promise<void> {
  await mockDelay()
  const credential = BAIT_CREDENTIALS.find((c) => c.id === id)
  if (credential) credential.linkedTokenId = tokenId
}

// ---- Evidence --------------------------------------------------------------

export async function getPayloads(): Promise<{ payloads: CapturedPayload[]; sources: CountRow[] }> {
  await mockDelay()
  return { payloads: PAYLOADS, sources: countBy(PAYLOADS.flatMap((p) => p.sources), 10) }
}

export async function getAnalysisResults(): Promise<AnalysisResultsData> {
  await mockDelay()
  return { results: [...ANALYSIS_RESULTS], gpuQueue: GPU_QUEUE.map((j) => ({ ...j })), modelHealth: MODEL_HEALTH, analyzers: ANALYZERS }
}

/** Mock write: queues a workbench run for a captured payload. */
export async function startWorkbenchRun(hash: string, analyzers: string[]): Promise<AnalysisResult | null> {
  await mockDelay()
  const payload = PAYLOADS.find((p) => p.hash === hash.toLowerCase())
  if (!payload) return null
  const run: AnalysisResult = {
    id: `wb-${Date.now().toString(36)}`,
    analyzer: 'workbench',
    hash: payload.hash,
    file: `${payload.hash.slice(0, 12)}`,
    at: new Date(MOCK_NOW).toISOString(),
    owner: MOCK_USER.name,
    recipe: analyzers.join('+'),
    state: 'queued',
    summary: 'Workbench run',
    detail: { analyzers },
  }
  ANALYSIS_RESULTS.unshift(run)
  return run
}

/** Mock write: only a still-queued job can be aborted. */
export async function abortGpuJob(jobId: string): Promise<boolean> {
  await mockDelay()
  const job = GPU_QUEUE.find((j) => j.jobId === jobId)
  if (job?.status !== 'queued') return false
  job.abortRequested = true
  job.status = 'aborted'
  return true
}

// ---- Detail pages ----------------------------------------------------------

export async function getEventDetail(id: string): Promise<EventDetail | null> {
  await mockDelay()
  const event = EVENTS.find((e) => e.id === id)
  if (!event) return null
  return {
    event,
    session: EVENTS.filter((e) => e.sessionId === event.sessionId && e.id !== id).slice(0, 25),
    // Same 5-tuple in spirit: same source address and port on the same sensor.
    connection: EVENTS.filter((e) => e.srcIp === event.srcIp && e.sensor === event.sensor && e.dstPort === event.dstPort && e.id !== id).slice(0, 10),
    source: EVENTS.filter((e) => e.srcIp === event.srcIp && e.sessionId !== event.sessionId).slice(0, 25),
    hashes: event.type === 'file.download' ? [event.summary.match(/[0-9a-f]{12}/)?.[0] ?? ''].filter(Boolean) : [],
  }
}

export async function getSessionDetail(id: string): Promise<SessionDetail | null> {
  await mockDelay()
  const events = EVENTS.filter((e) => e.sessionId === id)
  if (events.length === 0) return null
  return {
    id,
    events,
    srcIp: events[0].srcIp,
    country: events[0].country,
    first: events.at(-1)!.timestamp,
    last: events[0].timestamp,
    sensors: countBy(events.map((e) => e.sensor), 10),
    commands: countBy(events.map((e) => e.command), 15),
    credentials: countBy(events.map((e) => (e.username ? `${e.username}:${e.password}` : undefined)), 15),
    payloads: countBy(events.filter((e) => e.type === 'file.download').map((e) => e.summary), 10),
    techniques: techniquesFor(events),
    recordingShasum: RECORDINGS.find((r) => r.session === id)?.shasum,
  }
}

export async function getIpProfile(ip: string): Promise<IpProfile | null> {
  await mockDelay()
  const source = SOURCES.find((s) => s.ip === ip)
  const profile = SOURCE_PROFILES.find((p) => p.ip === ip)
  if (!source || !profile) return null
  const events = EVENTS.filter((e) => e.srcIp === ip)
  return {
    source: { ...profile, asn: source.asn, riskScore: source.riskScore, tags: source.tags },
    blocked: BLOCKED_IPS.has(ip),
    events,
    sensors: countBy(events.map((e) => e.sensor), 10),
    credentials: countBy(events.map((e) => (e.username ? `${e.username}:${e.password}` : undefined)), 10),
    commands: countBy(events.map((e) => e.command), 10),
    paths: countBy(events.filter((e) => e.type === 'http.request').map((e) => e.summary.replace(/^GET /, '')), 10),
    ports: countBy(events.map((e) => String(e.dstPort)), 10),
    protocols: countBy(events.map((e) => e.protocol), 10),
    sessions: countBy(events.map((e) => e.sessionId), 10),
    payloads: countBy(events.filter((e) => e.type === 'file.download').map((e) => e.summary), 10),
    alerts: countBy(events.filter((e) => e.type === 'ids.alert').map((e) => e.summary), 10),
    techniques: techniquesFor(events),
    correlation: {
      totalMatches: events.length + Math.round(events.length * 0.4),
      tunnelConnections: Math.round(events.length * 0.3),
      distinctSensors: new Set(events.map((e) => e.sensor)).size,
    },
    attackerId: ATTACKERS.find((a) => a.ips.includes(ip))?.id,
  }
}

/** Mock write: adds/removes the address on the portbridge manual blackhole. */
export async function setIpBlocked(ip: string, blocked: boolean): Promise<void> {
  await mockDelay()
  if (blocked) BLOCKED_IPS.add(ip)
  else BLOCKED_IPS.delete(ip)
}

function correlate(title: string, members: string[]): Correlation {
  const events = EVENTS.filter((e) => members.includes(e.srcIp))
  return {
    title,
    members,
    totalMatches: events.length + Math.round(events.length * 0.35),
    tunnelConnections: Math.round(events.length * 0.28),
    sensors: countBy(events.map((e) => e.sensor), 10),
    events: events.slice(0, 100),
  }
}

export async function getCidrCorrelation(cidr: string): Promise<Correlation | null> {
  await mockDelay()
  const match = cidr.match(/^(\d+\.\d+\.\d+)\.(\d+)\/(\d+)$/)
  if (!match) return null
  const size = 2 ** (32 - Number(match[3]))
  const start = Number(match[2])
  const members = SOURCES.filter((s) => {
    const [a, b, c, d] = s.ip.split('.')
    return `${a}.${b}.${c}` === match[1] && Number(d) >= start && Number(d) < start + size
  }).map((s) => s.ip)
  return members.length ? correlate(cidr, members) : null
}

export async function getClusterCorrelation(kind: string, value: string): Promise<Correlation | null> {
  await mockDelay()
  const cluster = INFRA_CLUSTERS.find((c) => c.kind === kind && c.value === value)
  if (cluster) {
    const members =
      kind === 'asn'
        ? SOURCES.filter((s) => s.asn === value).map((s) => s.ip)
        : kind === 'provider'
          ? SOURCES.filter((s) => s.org === value).map((s) => s.ip)
          : kind === 'credential'
            ? [...new Set(EVENTS.filter((e) => `${e.username}:${e.password}` === value).map((e) => e.srcIp))]
            : SOURCES.slice(0, cluster.sources).map((s) => s.ip)
    return correlate(`${kind}: ${value}`, members)
  }
  // ASNs/providers with a single member are not clusters, but the lookup
  // page can still route to them.
  const members = SOURCES.filter((s) => (kind === 'asn' && s.asn === value) || (kind === 'provider' && s.org === value)).map((s) => s.ip)
  return members.length ? correlate(`${kind}: ${value}`, members) : null
}

export async function getReplayDetail(shasum: string): Promise<ReplayDetail | null> {
  await mockDelay()
  const replay = REPLAYS.get(shasum)
  if (!replay) return null
  const sessions = RECORDINGS.filter((r) => r.shasum === shasum)
  const ip = sessions.find((r) => r.srcIp)?.srcIp
  const events = ip ? EVENTS.filter((e) => e.srcIp === ip) : []
  return {
    replay,
    sessions,
    attacker: ip
      ? {
          ip,
          events: events.length,
          sessions: new Set(events.map((e) => e.sessionId)).size,
          commands: countBy(events.map((e) => e.command), 10),
          credentials: countBy(events.map((e) => (e.username ? `${e.username}:${e.password}` : undefined)), 10),
          sensors: countBy(events.map((e) => e.sensor), 10),
          sessionIds: countBy(events.map((e) => e.sessionId), 10),
        }
      : null,
  }
}

/** Grouped search across the mock data set, as behind the palette's Enter. */
export async function searchAll(query: string): Promise<SearchGroup[]> {
  await mockDelay()
  const q = query.trim().toLowerCase()
  if (!q) return []
  const groups: SearchGroup[] = []
  const add = (id: string, title: string, items: SearchGroup['items']) => {
    if (items.length) groups.push({ id, title, total: items.length, items: items.slice(0, 8) })
  }
  add('sources', 'Source IPs', SOURCES.filter((s) => s.ip.includes(q) || s.org.toLowerCase().includes(q) || s.asn.toLowerCase() === q).map((s) => ({ label: s.ip, detail: `${s.org} · ${s.country} · ${s.events} events`, href: `/investigate/ip/${s.ip}` })))
  add('sessions', 'Sessions', [...new Set(EVENTS.filter((e) => e.sessionId.includes(q)).map((e) => e.sessionId))].map((id) => ({ label: id, detail: 'session', href: `/sessions/${id}` })))
  add('commands', 'Commands', [...new Set(EVENTS.filter((e) => e.command?.toLowerCase().includes(q)).map((e) => e.command!))].map((c) => ({ label: c, detail: 'executed command', href: `/history?q=${encodeURIComponent(q)}` })))
  add('credentials', 'Credentials', [...new Set(EVENTS.filter((e) => e.username && `${e.username}:${e.password}`.toLowerCase().includes(q)).map((e) => `${e.username}:${e.password}`))].map((c) => ({ label: c, detail: 'credential pair', href: `/investigate/cluster?kind=credential&value=${encodeURIComponent(c)}` })))
  add('payloads', 'Payloads', PAYLOADS.filter((p) => p.hash.includes(q) || p.verdict?.family?.toLowerCase().includes(q)).map((p) => ({ label: p.hash.slice(0, 24), detail: `${p.kind}${p.verdict?.family ? ` · ${p.verdict.family}` : ''}`, href: `/payload-analysis/${p.hash}` })))
  add('fingerprints', 'Fingerprints', INFRA_CLUSTERS.filter((c) => c.kind === 'fingerprint' && c.value.includes(q)).map((c) => ({ label: c.value, detail: `${c.sources} sources`, href: `/investigate/cluster?kind=fingerprint&value=${encodeURIComponent(c.value)}` })))
  add('signatures', 'IDS signatures', [...new Set(EVENTS.filter((e) => e.type === 'ids.alert' && e.summary.toLowerCase().includes(q)).map((e) => e.summary))].map((s) => ({ label: s, detail: 'Suricata signature', href: `/history?q=${encodeURIComponent(q)}` })))
  return groups
}

export async function getDeadLetters(query: string): Promise<DeadLetter[]> {
  await mockDelay()
  const q = query.trim().toLowerCase()
  return q ? DEAD_LETTERS.filter((d) => JSON.stringify(d).toLowerCase().includes(q)) : [...DEAD_LETTERS]
}

/** Mock write: purges exactly the documents the current query shows. */
export async function purgeDeadLetters(ids: string[]): Promise<number> {
  await mockDelay()
  const before = DEAD_LETTERS.length
  for (let i = DEAD_LETTERS.length - 1; i >= 0; i--) if (ids.includes(DEAD_LETTERS[i].id)) DEAD_LETTERS.splice(i, 1)
  return before - DEAD_LETTERS.length
}

export async function getProblemReports(): Promise<ProblemReport[]> {
  await mockDelay()
  return PROBLEM_REPORTS.map((r) => ({ ...r }))
}

export async function setProblemStatus(id: string, status: ProblemStatus): Promise<void> {
  await mockDelay()
  const report = PROBLEM_REPORTS.find((r) => r.id === id)
  if (report) report.status = status
}

export async function getSettings(): Promise<SettingsData> {
  await mockDelay()
  return {
    user: MOCK_USER,
    preferences: { ...PREFERENCES },
    services: SERVICES.map((s) => ({ ...s })),
    history: [...CONFIG_HISTORY],
    audit: [...AUDIT_LOG],
    branding: { ...SETTINGS_ADMIN.branding },
    honeypot: { ...SETTINGS_ADMIN.honeypot },
  }
}

export async function savePreferences(next: Preferences): Promise<void> {
  await mockDelay()
  Object.assign(PREFERENCES, next)
}

function audit(action: string, fields: string[]) {
  AUDIT_LOG.unshift({ id: `a-${Date.now().toString(36)}`, at: new Date(MOCK_NOW).toISOString(), actor: MOCK_USER.name, action, fields, result: 'ok' })
}

/** Mock write: stages an admin config section and records a revision. */
export async function saveAdminSection<TSection extends keyof typeof SETTINGS_ADMIN>(section: TSection, value: (typeof SETTINGS_ADMIN)[TSection]): Promise<void> {
  await mockDelay()
  const changed = Object.keys(value).filter((k) => (value as Record<string, unknown>)[k] !== (SETTINGS_ADMIN[section] as Record<string, unknown>)[k])
  Object.assign(SETTINGS_ADMIN[section], value)
  CONFIG_HISTORY.unshift({ id: `rev-${Date.now().toString(36)}`, at: new Date(MOCK_NOW).toISOString(), actor: MOCK_USER.name, section, summary: `Changed ${changed.join(', ') || 'nothing'}` })
  audit('config.save', changed.map((k) => `${section}.${k}`))
}

export async function runServiceAction(name: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
  await mockDelay()
  const service = SERVICES.find((s) => s.name === name)
  if (!service) return
  service.state = action === 'stop' ? 'exited' : 'running'
  service.uptime = action === 'stop' ? '—' : '0m'
  audit(`service.${action}`, [name])
}

export async function rollbackConfig(revisionId: string): Promise<void> {
  await mockDelay()
  const revision = CONFIG_HISTORY.find((r) => r.id === revisionId)
  if (!revision) return
  CONFIG_HISTORY.unshift({ id: `rev-${Date.now().toString(36)}`, at: new Date(MOCK_NOW).toISOString(), actor: MOCK_USER.name, section: revision.section, summary: `Rolled back to ${revision.id}` })
  audit('config.rollback', [revision.id])
}

// ---- Evidence detail -------------------------------------------------------

export async function getPayloadAnalysis(hash: string): Promise<PayloadAnalysis | null> {
  await mockDelay()
  const payload = findPayload(hash)
  return payload ? buildPayloadAnalysis(payload) : null
}

export type PayloadAction = 'sandbox' | 'ghidra' | 'github' | 'pdf'

/** Mock write: queues follow-up work on a sample. Returns what was queued. */
export async function queuePayloadAction(hash: string, action: PayloadAction): Promise<string> {
  await mockDelay()
  const labels: Record<PayloadAction, string> = {
    sandbox: 'Sandbox detonation queued',
    ghidra: 'Ghidra decompilation queued on the GPU queue',
    github: 'Submitted for GitHub publication and scanning',
    pdf: 'PDF report generation started',
  }
  if (action === 'ghidra') {
    GPU_QUEUE.push({ jobId: `gpu-${Date.now().toString(36)}`, requestedAt: new Date(MOCK_NOW).toISOString(), jobType: 'ghidra-summary', model: 'qwen2.5-coder:14b', status: 'queued', attempts: 0, abortRequested: false, ref: hash.slice(0, 16), vramMib: 10_240 })
  }
  return labels[action]
}

export async function getSandboxRun(job: string): Promise<SandboxRun | null> {
  await mockDelay()
  const payload = findPayload(job)
  return payload && payload.dynamic ? buildSandboxRun(payload) : null
}

/** Whether a Windows-sandbox detonation is live right now (mock: none is). */
export async function getSandboxLiveStatus(): Promise<{ running: boolean; job?: string; since?: string }> {
  await mockDelay()
  return { running: false }
}

export async function getGhidraAnalysis(sha: string): Promise<GhidraAnalysis | null> {
  await mockDelay()
  const payload = findPayload(sha)
  return payload && payload.kind !== 'shell script' ? buildGhidraAnalysis(payload) : null
}

export async function getRevDeckRuns(): Promise<RevDeckRun[]> {
  await mockDelay()
  return REVDECK_RUNS
}

export async function getRevDeckRun(sha: string): Promise<RevDeckRun | null> {
  await mockDelay()
  return REVDECK_RUNS.find((r) => r.sha === sha) ?? null
}

export async function getCapeRuns(): Promise<CapeRun[]> {
  await mockDelay()
  return CAPE_RUNS
}

export async function getCapeRun(sha: string): Promise<CapeRun | null> {
  await mockDelay()
  return CAPE_RUNS.find((r) => r.sha === sha) ?? null
}

export async function getGithubAnalyses(): Promise<GithubAnalysis[]> {
  await mockDelay()
  return GITHUB_ANALYSES
}

export async function getGithubAnalysis(sha: string): Promise<GithubAnalysis | null> {
  await mockDelay()
  return GITHUB_ANALYSES.find((r) => r.sha === sha) ?? null
}

/** Everything behind the Overview's five views. */
export async function getOverviewViews(): Promise<OverviewViews> {
  await mockDelay()
  return OVERVIEW_VIEWS
}
