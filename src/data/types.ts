// Domain types the UI renders. Shaped after the canonical BFF responses so the
// mock implementations in ./mock can be swapped for real server functions
// without touching page code.

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type Protocol = 'ssh' | 'telnet' | 'http' | 'smb' | 'rdp' | 'ftp' | 'mysql' | 'sip'

export type EventType =
  | 'connection'
  | 'login.failed'
  | 'login.success'
  | 'command.input'
  | 'file.download'
  | 'http.request'
  | 'ids.alert'

export type SensorStatus = 'online' | 'degraded' | 'offline'

export interface SessionUser extends Record<string, unknown> {
  name: string
  email: string
  roles: string[]
}

export interface Sensor extends Record<string, unknown> {
  id: string
  name: string
  kind: string
  protocols: Protocol[]
  location: string
  status: SensorStatus
  eventsLast24h: number
  lastSeen: string
}

export interface HoneypotEvent extends Record<string, unknown> {
  id: string
  timestamp: string
  sensor: string
  protocol: Protocol
  type: EventType
  severity: Severity
  srcIp: string
  srcPort: number
  dstPort: number
  country: string
  asn: string
  sessionId: string
  username?: string
  password?: string
  command?: string
  summary: string
}

export interface AttackSource extends Record<string, unknown> {
  ip: string
  country: string
  asn: string
  org: string
  events: number
  sessions: number
  firstSeen: string
  lastSeen: string
  riskScore: number
  tags: string[]
}

export interface Kpi {
  id: string
  label: string
  value: number
  previous: number
  /** Hourly values oldest → newest, for sparklines. */
  trend: number[]
}

export interface TimeBucket extends Record<string, unknown> {
  /** ISO timestamp of the bucket start. */
  time: string
  total: number
  byProtocol: Partial<Record<Protocol, number>>
}

export interface CountRow extends Record<string, unknown> {
  id: string
  label: string
  count: number
}

export interface OverviewData {
  generatedAt: string
  kpis: Kpi[]
  timeline: TimeBucket[]
  topProtocols: Protocol[]
  topSources: AttackSource[]
  topCountries: CountRow[]
  topUsernames: CountRow[]
  topPasswords: CountRow[]
  recentEvents: HoneypotEvent[]
  sensors: Sensor[]
}

// ---- Monitor: ML anomalies -------------------------------------------------

export const DISPOSITIONS = ['false_positive', 'true_positive', 'benign_known'] as const
export type Disposition = (typeof DISPOSITIONS)[number]
export type AnomalyStatus = 'open' | 'acknowledged' | Disposition

export interface MlAnomaly extends Record<string, unknown> {
  id: string
  timestamp: string
  severity: Severity
  compositeScore: number
  modelScores: { isolationForest: number; lstmAe: number; hbos: number }
  srcIp?: string
  country?: string
  explanation: string
  sourceEventId: string
  sourceIndex: string
  eventType: string
  dstPort: number
  proto: string
  sensor: string
  status: AnomalyStatus
  dispositionReason?: string
  /** Anomalies from the same address in the same second, folded into this row. */
  folded: number
  thresholdAtScoring: number
  modelState?: string
}

export interface ModelHealth extends Record<string, unknown> {
  model: string
  timestamp: string
  accepted: boolean
  reason: string
  anomalyRateNew: number
  anomalyRatePrevious: number
  trainSamples: number
}

export interface ScorePoint extends Record<string, unknown> {
  time: string
  isolationForest: number
  lstmAe: number
  hbos: number
}

export interface MlAnomaliesData {
  anomalies: MlAnomaly[]
  total24h: number
  openBacklog: number
  bySeverity: CountRow[]
  topSources: CountRow[]
  eventTypes: string[]
  scoreTimeline: ScorePoint[]
  modelHealth: ModelHealth[]
}

// ---- Monitor: LLM analysis -------------------------------------------------

export type LlmDocType = 'session' | 'payload' | 'report'

export interface LlmAnalysis extends Record<string, unknown> {
  id: string
  timestamp: string
  docType: LlmDocType
  severity: Severity
  confidence?: 'low' | 'medium' | 'high'
  intent: string
  summary: string
  sessionId?: string
  payloadSha256?: string
  srcIp?: string
  model: string
  behaviors: string[]
  error?: string
}

export interface SemanticHit extends Record<string, unknown> {
  id: string
  score: number
  severity: Severity
  summary: string
  sessionId?: string
}

export type SemanticSearchResult = { available: true; hits: SemanticHit[] } | { available: false; reason: string }

// ---- Monitor: agent campaigns ----------------------------------------------

export interface DecodeStep {
  transform: string
  inputSha256: string
  outputSha256: string
  outputLen: number
}

export interface MatchedRule {
  rule: string
  reason: string
  trustBoundary: string
  decodeChain: DecodeStep[]
}

export interface CampaignEvent {
  eventId: string
  sourceIndex: string
  timestamp: string
  matchedRules: MatchedRule[]
}

export interface AgentCampaign extends Record<string, unknown> {
  id: string
  timestamp: string
  start: string
  end: string
  severity: Severity
  categories: string[]
  identifiers: string[]
  eventCount: number
  events: CampaignEvent[]
}

// ---- Monitor: auth-failure events ------------------------------------------

export interface AuthFailure extends Record<string, unknown> {
  id: string
  timestamp: string
  type: string
  ip?: string
  error: string
  username?: string
  clientId: string
  realm: string
  redirectUri?: string
  userId?: string
}

export interface AuthEventsData {
  events: AuthFailure[]
  failed24h: number
  byClient: CountRow[]
  topSources: CountRow[]
}

// ---- Investigate -----------------------------------------------------------

export type EventKind = 'connection' | 'login' | 'command' | 'download' | 'http' | 'alert'

export interface EventFilters {
  ip?: string
  sensor?: string
  country?: string
  proto?: Protocol
  port?: number
  kind?: EventKind
  /** Relative window such as `1h`, `6h`, `24h`. */
  since?: string
}

export interface EventsPage {
  rows: HoneypotEvent[]
  total: number
  values: { sensors: string[]; countries: string[]; protos: Protocol[]; ports: number[] }
}

export interface SourceProfile extends Record<string, unknown> {
  ip: string
  country: string
  org: string
  events: number
  logins: number
  sessions: number
  sensors: string[]
  first: string
  last: string
}

export interface MapPoint {
  country: string
  lat: number
  lon: number
  events: number
}

export interface NetworkCampaign extends Record<string, unknown> {
  cidr: string
  score: number
  events: number
  uniqueIps: number
  sensors: string[]
  ports: number[]
  creds: number
  payloads: number
  alerts: number
  providers: string[]
  asns: string[]
  fingerprints: number
  explanation: string
  sequence: string[]
  scan?: 'horizontal' | 'vertical'
  dstIpsTouched: number
  portsTouched: number
  first: string
  last: string
}

export interface CredEdge extends Record<string, unknown> {
  id: string
  user: string
  pass: string
  uniqueIps: number
  sensors: string[]
  events: number
  last: string
}

export type ClusterKind = 'fingerprint' | 'payload' | 'asn' | 'provider' | 'credential'

export interface InfraCluster extends Record<string, unknown> {
  id: string
  kind: ClusterKind
  value: string
  sources: number
  events: number
  sensors: string[]
}

export interface AttackerEntity extends Record<string, unknown> {
  id: string
  ips: string[]
  fingerprints: string[]
  payloads: string[]
  credentials: string[]
  sensors: string[]
  events: number
  first: string
  last: string
  updated: string
  verdicts: string[]
  techniques: string[]
  scan?: 'horizontal' | 'vertical'
  destIps: number
  portsTouched: number
}

export interface KillChainData {
  flow: { nodes: Array<{ name: string }>; links: Array<{ source: number; target: number; value: number }> }
  timeline: Array<{ cidr: string; first: string; last: string; events: number }>
  coverage: Array<{ tactic: string; technique: string; name: string; events: number }>
  tactics: string[]
}

export interface SensorSummary {
  sensor: string
  events: number
}

export interface SensorDetail {
  sensor: Sensor
  uniqueSources: number
  timeline: TimeBucket[]
  topSources: CountRow[]
  byType: CountRow[]
  recentEvents: HoneypotEvent[]
}

export interface Recording extends Record<string, unknown> {
  id: string
  when: string
  srcIp?: string
  country?: string
  session: string
  shasum: string
  sizeBytes: number
  durationMs: number
}

export interface Replay {
  shasum: string
  frames: number
  durationSeconds: number
  transcript: string
}

// ---- Operations ------------------------------------------------------------

export interface AlertRecord {
  key: string
  kind: string
  message: string
  severity: Severity
  count: number
  firstSeen: string
  lastSeen: string
  lastNotified?: string
  acknowledged: boolean
  acknowledgedBy?: string
  link?: string
}

/** Same-rule alerts folded into one row (hashes/IPs blanked in the message). */
export interface AlertGroup extends Record<string, unknown> {
  id: string
  kind: string
  message: string
  severity: Severity
  count: number
  firstSeen: string
  lastSeen: string
  acknowledged: boolean
  members: AlertRecord[]
}

export type FeedState = 'fresh' | 'delayed' | 'stale' | 'silent'

export interface SensorFeed extends Record<string, unknown> {
  sensor: string
  state: FeedState
  documents: number
  lastSeen: string
}

export interface SourceHealth {
  clusterStatus: 'green' | 'yellow' | 'red'
  indexedDocuments: number
  feeds: SensorFeed[]
  ingest: { state: FeedState; lastIngest: string; ageSeconds: number; recentDeadLetters: number }
  yara: { enabled: boolean; lastScan: string; rulesSha256: string; samples: number; matched: number; errors: number }
  runtime: { uptimeSeconds: number; rssBytes: number; vmBytes: number }
  pipeline: { state: 'running' | 'degraded' | 'stopped'; acked: number; failed: number; dropped: number; active: number; decodeFailures: number }
  deadLetters: number
}

export interface TopologySensor extends Record<string, unknown> {
  sensor: string
  ingress: Array<'portbridge' | 'traefik' | 'direct' | 'proxy'>
  hostnames: string[]
  ports: Array<{ proto: 'tcp' | 'udp'; public: number; host: number }>
  rawIndex: string
  feed: FeedState
}

export type ContainerState = 'running' | 'restarting' | 'exited' | 'unknown'

export interface Topology {
  flow: { nodes: Array<{ name: string }>; links: Array<{ source: number; target: number; value: number }> }
  sensors: TopologySensor[]
  stacks: Array<{ stack: string; containers: Array<{ name: string; state: ContainerState }> }>
}

// ---- Reports ---------------------------------------------------------------

export type ReportFrequency = 'daily' | 'weekly' | 'monthly'

export interface ReportDefinition extends Record<string, unknown> {
  id: string
  name: string
  template: string
  theme: 'dark' | 'light'
  elements: string[]
  scope: { window: string; ip: string; sensor: string; port: string; signature: string }
  branding: { title: string; author: string; headerLeft: string; headerRight: string; footerLeft: string; classification: string }
  schedule: { frequency: ReportFrequency; hour: number; minute: number; weekday: number; monthDay: number } | null
  created: string
}

export interface ReportTemplate {
  id: string
  name: string
  description: string
  elements: string[]
}

export interface GeneratedReport extends Record<string, unknown> {
  id: string
  title: string
  template: string
  origin: 'manual' | 'schedule'
  createdAt: string
  sizeBytes: number
  definitionId: string
}

export interface ReportsData {
  templates: ReportTemplate[]
  elements: Array<{ id: string; label: string; description: string }>
  definitions: ReportDefinition[]
  generated: GeneratedReport[]
}

// ---- Tools -----------------------------------------------------------------

export interface CanaryToken extends Record<string, unknown> {
  id: string
  type: string
  memo: string
  url: string
  hostname: string
  createdAt: string
  createdBy: string
  artifact?: string
}

export interface CanaryTrigger extends Record<string, unknown> {
  id: string
  tokenId: string
  memo: string
  type: string
  triggeredAt: string
  srcIp: string
  userAgent: string
  location: string
}

export interface CanaryTokenType {
  type: string
  label: string
  description: string
  needs?: 'text' | 'image'
}

export interface BaitCredential extends Record<string, unknown> {
  id: string
  path: string
  target: string
  username: string
  password: string
  memo: string
  template: string
  linkedTokenId?: string
  createdAt: string
  createdBy: string
  rotatedAt?: string
  rotatedBy?: string
}

// ---- Evidence --------------------------------------------------------------

export interface CapturedPayload extends Record<string, unknown> {
  hash: string
  sources: string[]
  kind: string
  platform: string
  mime: string
  sizeBytes: number
  copies: number
  dynamic: boolean
  preview: string
  capturedAt: string
  verdict?: { label: 'malicious' | 'suspicious' | 'clean'; family?: string }
}

export type AnalyzerTab = 'workbench' | 'static' | 'yara' | 'sandbox' | 'ghidra'

export interface AnalysisResult extends Record<string, unknown> {
  id: string
  analyzer: AnalyzerTab
  hash: string
  file: string
  at: string
  summary: string
  state?: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  risk?: number
  matches?: string[]
  platform?: string
  owner?: string
  recipe?: string
  detail: Record<string, unknown>
}

export interface GpuJob extends Record<string, unknown> {
  jobId: string
  requestedAt: string
  jobType: string
  model: string
  status: 'queued' | 'running' | 'done' | 'failed' | 'aborted'
  attempts: number
  abortRequested: boolean
  ref: string
  vramMib: number
}

export interface AnalysisResultsData {
  results: AnalysisResult[]
  gpuQueue: GpuJob[]
  analyzers: Array<{ id: string; label: string; description: string; gpu: boolean }>
}
