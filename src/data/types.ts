// Domain types the UI renders. Shaped after the canonical BFF responses so the
// mock implementations in ./mock can be swapped for real server functions
// without touching page code.

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

/** The application protocol a sensor recorded (`network.protocol`): ssh,
 * telnet, http, smb, modbus, s7comm, sip, dns, dicom, … as each sensor names it. */
export type Protocol = string

export type EventType =
  | 'connection'
  | 'login.failed'
  | 'login.success'
  | 'command.input'
  | 'file.download'
  | 'http.request'
  | 'ids.alert'
  /** A non-HTTP application request: ICS, SIP, DNS, DICOM, SMTP, IKE. */
  | 'protocol.request'

/** One value in a sensor's own fields: JSON, as the sensor wrote it. */
export type FieldValue = string | number | boolean | null | FieldValue[] | { [key: string]: FieldValue }
export type SensorFields = Record<string, FieldValue>

export type SensorStatus = 'online' | 'degraded' | 'offline'

export interface SessionUser extends Record<string, unknown> {
  name: string
  email: string
  roles: string[]
}

export interface Sensor extends Record<string, unknown> {
  /** The sensor name events carry in `event.sensor`, e.g. `cowrie`, `conpot-s7-1200`. */
  id: string
  name: string
  /** The family, e.g. Cowrie, Conpot. */
  kind: string
  /** One phrase: what this sensor is and what it captures. */
  what: string
  /** Listening ports on the sensor host. */
  ports: Array<{ proto: 'tcp' | 'udp'; port: number }>
  /** The decoy identity it wears: a fictional organization, site and assets. */
  persona?: { id: string; organization: string; site: string; assets: string[] }
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
  /** The sensor's own event name: `cowrie.login.failed`, `handshake`, `NEW_CONNECTION`, … */
  eventName: string
  /** The sensor's own `honeypot.*` object, as that sensor writes it. */
  fields: SensorFields
  /** The decoy identity that was targeted (`honeypot.persona_id` and
   * friends); absent on sensors that wear none. */
  persona?: string
  site?: string
  asset?: string
  organization?: string
  /** The client fingerprint this event carries, and what kind it is
   * (HASSH, JA4, User-Agent, SSH client, client banner, SSH pubkey). */
  fingerprint?: string
  fingerprintKind?: string
  /** ATT&CK techniques the pipeline mapped this event to. */
  techniques: string[]
  /** The source network: organization, provider class, city. */
  org: string
  provider: ProviderClass
  city: string
  /** What an HTTP request carried (php-code, path-traversal, …). */
  payloadClass?: string
  /** DNP3 control-function severity: an unconfirmed operate is critical. */
  icsSeverity?: 'critical' | 'high'
}

/** How the source network is classified (`source.as.type`). */
export type ProviderClass = 'network' | 'hosting' | 'cloud' | 'scanner' | 'blocklist:spamhaus'

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
  provider: ProviderClass
  city: string
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
  byProtocol: Record<Protocol, number>
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

export type EventKind = 'connection' | 'login' | 'command' | 'download' | 'http' | 'protocol' | 'alert'

/** Each filter is a comma list (?sensor=a,b) and matches any of its values. */
export interface EventFilters {
  /** Decoy pivots: which persona, site or asset was targeted. */
  persona?: string
  site?: string
  asset?: string
  /** Source pivots. */
  fingerprint?: string
  org?: string
  provider?: string
  city?: string
  ip?: string
  sensor?: string
  country?: string
  proto?: string
  port?: string | number
  kind?: string
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
  /** Distinct source addresses from this country, when known. */
  ips?: number
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

export interface SensorMeasure {
  label: string
  value: number
  /** The busiest single source for this measure, e.g. "12 from 198.51.100.7". */
  peak: string
}

/** How to read one sensor's own fields: a column per field that matters,
 * and the artefact worth running the sensor for. */
export interface SensorReading {
  what: string
  columns: Array<{ header: string; field: string | string[]; mono?: boolean; badge?: 'danger' | 'warning' | 'success' | 'muted' | 'info' }>
  artefacts: Array<{ label: string; field: string | string[] }>
}

export interface SensorDetail {
  sensor: Sensor
  uniqueSources: number
  firstSeen: string
  timeline: TimeBucket[]
  /** The quantities this sensor type exists to produce. */
  measures: SensorMeasure[]
  topSources: CountRow[]
  topCountries: CountRow[]
  /** This sensor type's own leaderboards. */
  topLists: Array<{ label: string; rows: CountRow[] }>
  byType: CountRow[]
  recentEvents: HoneypotEvent[]
  /** How to read this sensor's own fields. */
  reading: SensorReading
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
  /** Each filter matches any of its values; an empty list means no filter. */
  scope: { window: string; ip: string[]; sensor: string[]; port: string[]; signature: string[] }
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

/** One value a filter can take, with how many events carry it. */
export interface FacetValue {
  value: string
  label?: string
  count: number
}

/** Every value each filter can take, for pickers that show them all. */
export interface Facets {
  sensors: FacetValue[]
  sources: FacetValue[]
  countries: FacetValue[]
  protocols: FacetValue[]
  ports: FacetValue[]
  signatures: FacetValue[]
  kinds: FacetValue[]
  personas: FacetValue[]
  providers: FacetValue[]
}

/** What a draft definition would cover, checked before rendering. */
export interface ReportPreview {
  events: number
  sources: number
  sensors: number
  sessions: number
  /** Rows each selected section would carry, and its approximate pages. */
  sections: Array<{
    id: string
    label: string
    rows: number
    pages: number
    /** Column headings and the first rows as the document will print them. */
    columns: [string, string]
    sample: Array<[string, string]>
  }>
  pages: number
  /** The period the scope window covers, as ISO timestamps. */
  period: { from: string; to: string }
  /** The scope filter that matched nothing, when one did. */
  emptyFilter?: { field: 'ip' | 'sensor' | 'port' | 'signature' | 'window'; message: string }
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

export type AnalyzerId = 'static' | 'yara' | 'sandbox' | 'cape' | 'ghidra' | 'revdeck'

/** Everything one analysis run can be told, per analyzer. Only the options of
 * the analyzers in `analyzers` apply. */
export interface AnalysisRunConfig {
  hash: string
  analyzers: AnalyzerId[]
  static: { minStringLength: number; extractIocs: boolean; decodeCandidates: boolean; sectionEntropy: boolean }
  yara: { rulesets: string[]; stopAtFirstMatch: boolean; timeoutSeconds: number }
  sandbox: { image: string; durationSeconds: number; network: 'none' | 'simulated' | 'tor'; capturePcap: boolean; memoryDump: boolean; liveView: boolean }
  cape: { image: string; durationSeconds: number; package: 'auto' | 'exe' | 'dll'; network: 'none' | 'simulated' | 'tor'; humanInteraction: boolean }
  ghidra: { depth: 'standard' | 'aggressive'; maxFunctions: number; model: string; capa: boolean; floss: boolean }
  revdeck: { model: string; maxSteps: number; requireCitations: boolean }
  run: { priority: 'normal' | 'high'; label: string; notify: boolean; force: boolean }
}

export interface AnalysisResultsData {
  results: AnalysisResult[]
  gpuQueue: GpuJob[]
  /** Latest retrain outcome per approved local model. */
  modelHealth: ModelHealth[]
  analyzers: Array<{ id: AnalyzerId; label: string; description: string; gpu: boolean }>
}

// ---- Detail pages ----------------------------------------------------------

export interface Technique extends Record<string, unknown> {
  id: string
  name: string
  tactic: string
  events: number
}

export interface EventDetail {
  event: HoneypotEvent
  session: HoneypotEvent[]
  connection: HoneypotEvent[]
  source: HoneypotEvent[]
  hashes: string[]
  /** How to read the capturing sensor's own fields. */
  reading: SensorReading
}

export interface SessionDetail {
  id: string
  events: HoneypotEvent[]
  srcIp: string
  country: string
  first: string
  last: string
  sensors: CountRow[]
  commands: CountRow[]
  credentials: CountRow[]
  payloads: CountRow[]
  techniques: Technique[]
  recordingShasum?: string
}

export interface IpProfile {
  source: SourceProfile & { asn: string; riskScore: number; tags: string[] }
  blocked: boolean
  events: HoneypotEvent[]
  sensors: CountRow[]
  credentials: CountRow[]
  commands: CountRow[]
  paths: CountRow[]
  ports: CountRow[]
  protocols: CountRow[]
  sessions: CountRow[]
  payloads: CountRow[]
  alerts: CountRow[]
  techniques: Technique[]
  correlation: { totalMatches: number; tunnelConnections: number; distinctSensors: number }
  attackerId?: string
}

export interface Correlation {
  title: string
  members: string[]
  totalMatches: number
  tunnelConnections: number
  sensors: CountRow[]
  events: HoneypotEvent[]
}

export interface ReplayDetail {
  replay: Replay
  sessions: Recording[]
  attacker: { ip: string; events: number; sessions: number; commands: CountRow[]; credentials: CountRow[]; sensors: CountRow[]; sessionIds: CountRow[] } | null
}

export interface SearchGroup {
  id: string
  title: string
  total: number
  items: Array<{ label: string; detail: string; href: string }>
}

export interface DeadLetter extends Record<string, unknown> {
  id: string
  timestamp: string
  reason: string
  source: string
  index: string
  document: Record<string, unknown>
}

export type ProblemStatus = 'open' | 'triaged' | 'fixed' | 'wontfix'

export interface ProblemReport extends Record<string, unknown> {
  id: string
  submittedAt: string
  submittedBy: string
  status: ProblemStatus
  page: string
  expected: string
  actual: string
  consoleErrors: string[]
  networkFailures: string[]
  apiCalls: Array<{ method: string; path: string; status: number }>
  actionTrail: string[]
  userAgent: string
  hasSnapshot: boolean
}

/** A message a mail sensor captured. The body is kept as plain text only
 * (an HTML body is decoded, never rendered) and attachments as metadata
 * only, so the viewer can be neither a script sink nor a malware source. */
export interface CapturedMail {
  sessionId: string
  sizeBytes: number
  importedAt: string
  from: MailAddress | null
  to: MailAddress[]
  subject: string
  /** The Date header, as sent. */
  date: string
  messageId: string
  bodyText: string
  /** True when the message had only an HTML part, decoded to text here. */
  fromHtml: boolean
  attachments: Array<{ filename: string; contentType: string; sizeBytes: number; sha256: string }>
}

export interface MailAddress {
  name: string
  address: string
}

/** Per-operator preferences, as the preference store keeps them. */
export interface Preferences {
  theme: 'system' | 'dark' | 'light'
  /** Accent palette from the shared theme. */
  palette: Palette
  density: 'comfortable' | 'compact'
  motion: 'system' | 'on' | 'off'
  highContrast: boolean
  /** Bigger monospace for payloads, commands and raw records. */
  largeEvidenceText: boolean
  /** Wrap long values in tables instead of truncating them. */
  wrapLongValues: boolean
  collapsedSidebar: boolean
  landing: string
  rowsPerPage: number
  openDetailsInNewTab: boolean
  /** Keep a page's filters when coming back to it. */
  rememberFilters: boolean
  /** `browser`, or an IANA zone such as Europe/Berlin. */
  timezone: string
  clock: 'h24' | 'h12'
  timestamps: 'relative' | 'absolute'
  autoRefresh: boolean
  refreshSeconds: number
  liveToasts: boolean
  /** Minimum seconds between two operational toasts. */
  liveToastSeconds: number
  mapBasemap: 'osm'
  mapClustering: boolean
  mapAnimation: boolean
  /** Notify for alerts at or above this severity. */
  notifySeverity: Severity
  notifySound: boolean
  notifyDesktop: boolean
  notifyCanary: boolean
  defaultWindow: string
}

export type Palette = 'claude' | 'amber' | 'lavender' | 'lime' | 'neon' | 'ocean' | 'rose' | 'slate'

/** Dashboard configuration, by section, as the config store keeps it.
 * Every write is validated first and recorded as a revision. */
export interface DashboardConfig {
  revision: number
  presentation: {
    appName: string
    productLabel: string
    dashboardTitle: string
    dashboardSubtitle: string
    orgName: string
    overviewIntro: string
    helpLinkLabel: string
    helpLinkUrl: string
    bannerText: string
    bannerSeverity: '' | 'info' | 'success' | 'warning' | 'danger'
    /** RFC 3339, or empty for no expiry. */
    bannerExpires: string
    footerText: string
    aiDisclaimer: string
    privacyNotice: string
  }
  behavior: {
    defaultLanding: string
    defaultTimeWindow: string
    rowsPerPageOptions: number[]
    maxExportRows: number
    refreshIntervalOptions: number[]
    sourceStaleMinutes: number
    mapProvider: 'osm'
    defaultTimezone: string
    showMlPanels: boolean
    maintenanceMode: boolean
    readOnly: boolean
    showProblemReportButton: boolean
  }
  honeypot: {
    /** A duration such as 30m or 2h, between 5m and 168h. */
    alertCooldown: string
    alertCampaignScore: number
    sandboxAlertRiskScore: number
    mlAlertThreshold: number
    yaraScanIntervalSeconds: number
    yaraMaxBytes: number
    payloadDedupeIntervalSeconds: number
  }
  /** Name and description overrides per report template id. */
  reportPresets: Partial<Record<string, { name?: string; description?: string }>>
}

export type ConfigSection = Exclude<keyof DashboardConfig, 'revision'>

/** What validation found wrong, field name → message. Empty when valid. */
export type ConfigProblems = Record<string, string>

/** The report sender's own counters, as it last published them. */
export interface ReporterStats {
  available: boolean
  reason?: string
  stats?: { attempted: number; sent: number; suppressedCooldown: number; dryRun: number; failed: number; updatedAt: string }
}

/** Elasticsearch storage at a glance. */
export interface EsStorage {
  clusterStatus: 'green' | 'yellow' | 'red'
  indexCount: number
  docCount: number
  storeBytes: number
  /** The biggest index families, for where the space goes. */
  families: Array<{ family: string; indices: number; docs: number; bytes: number }>
}

export interface ServiceStatus extends Record<string, unknown> {
  name: string
  stack: string
  state: ContainerState
  uptime: string
  image: string
}

export interface ConfigRevision extends Record<string, unknown> {
  id: string
  at: string
  actor: string
  section: string
  summary: string
}

export interface AuditEntry extends Record<string, unknown> {
  id: string
  at: string
  actor: string
  action: string
  fields: string[]
  result: 'ok' | 'rejected'
}

export interface SettingsData {
  user: SessionUser
  preferences: Preferences
  services: ServiceStatus[]
  history: ConfigRevision[]
  audit: AuditEntry[]
  config: DashboardConfig
  reporter: ReporterStats
  storage: EsStorage
  /** The template catalog, for naming preset overrides. */
  reportTemplates: ReportTemplate[]
}

// ---- Evidence detail -------------------------------------------------------

export interface Ioc extends Record<string, unknown> {
  id: string
  kind: 'ip' | 'domain' | 'url' | 'path'
  value: string
}

export interface PayloadAnalysis {
  payload: CapturedPayload
  staticRisk: number
  packingLikelihood: number
  hashes: { md5: string; sha1: string; sha256: string; ssdeep: string; tlsh: string }
  fileType: string
  entryPoint?: string
  classification?: string
  yara: string[]
  iocs: Ioc[]
  strings: string[]
  decoded: Array<{ encoding: string; value: string }>
  sections: Array<{ name: string; size: number; entropy: number }>
  preview: string
  sandbox?: { job: string; risk: number; verdict: string }
  ghidra: boolean
  github?: { status: GithubStatus; detections: number; engines: number }
}

export interface SandboxRun {
  job: string
  hash: string
  at: string
  verdict: 'malicious' | 'suspicious' | 'benign'
  risk: number
  platform: string
  durationSeconds: number
  packets: number
  changedPaths: string[]
  syscalls: CountRow[]
  processesAdded: string[]
  socketsAdded: string[]
  output: string
  dns: string[]
  connections: Array<{ proto: string; dst: string; port: number; bytes: number }>
  iocsStatic: string[]
  iocsDynamic: string[]
  techniques: Technique[]
  diagnostics: Record<string, string>
}

export interface GhidraFunction extends Record<string, unknown> {
  name: string
  address: string
  size: number
  calls: number
  decompiled: string
}

export interface GhidraAnalysis {
  hash: string
  at: string
  arch: string
  functions: GhidraFunction[]
  imports: CountRow[]
  strings: string[]
  cryptoConstants: Array<{ name: string; address: string }>
  fuzzy: { ssdeep: string; tlsh: string; imphash: string }
  capa: Array<{ capability: string; namespace: string; attck?: string }>
  floss: { decoded: string[]; stack: string[]; tight: string[] }
  aiTriage: { summary: string; model: string; confidence: 'low' | 'medium' | 'high' }
}

export interface RevDeckRun extends Record<string, unknown> {
  sha: string
  at: string
  status: 'completed' | 'failed'
  verdict: string
  summary: string
  steps: Array<{ tool: string; input: string; output: string }>
  citations: { valid: string[]; invalid: string[] }
  error?: string
}

export interface CapeRun extends Record<string, unknown> {
  sha: string
  at: string
  status: 'reported' | 'failed_analysis'
  malscore: number
  signatures: Array<{ name: string; severity: number; description: string }>
  processes: Array<{ pid: number; name: string; commandLine: string }>
  dumps: string[]
  config: Record<string, string>
  log: string
}

export type GithubStatus = 'published' | 'dry_run' | 'denylist_blocked' | 'quota_exceeded'

export interface GithubAnalysis extends Record<string, unknown> {
  sha: string
  at: string
  status: GithubStatus
  detections: number
  engines: number
  risk: 'high' | 'medium' | 'low'
  family?: string
  results: Array<{ engine: string; verdict: 'malicious' | 'suspicious' | 'undetected'; label?: string }>
  yaraRules: string[]
  repoPath: string
}

// ---- Overview views --------------------------------------------------------

export interface SeriesPoint extends Record<string, unknown> {
  time: string
}

export interface HeatmapRow {
  sensor: string
  /** Events per hour, oldest → newest (24 cells). */
  cells: number[]
}

export interface AttackVectors {
  ports: CountRow[]
  protocols: CountRow[]
}

export interface OverviewViews {
  heatmap: HeatmapRow[]
  vectors: Record<string, AttackVectors>
  mapPoints: MapPoint[]
  feeds: SensorFeed[]
  protocols: CountRow[]
  mlBacklog: SeriesPoint[]
  topIps: CountRow[]
  topPorts: CountRow[]
  countries: CountRow[]
  asns: CountRow[]
  providers: CountRow[]
  netflowBytes: SeriesPoint[]
  netflowPackets: SeriesPoint[]
  conformance: SeriesPoint[]
  cves: CountRow[]
  credentials: CountRow[]
  commands: CountRow[]
  clients: CountRow[]
  fingerprints: CountRow[]
  paths: CountRow[]
  osDistribution: CountRow[]
  tcpClusters: CountRow[]
  icsFunctions: CountRow[]
  decoyRequests: CountRow[]
  decoyClients: CountRow[]
  ja4h: CountRow[]
  ja4l: CountRow[]
  ja4x: CountRow[]
  tls: CountRow[]
  ssh: CountRow[]
  endlessh: CountRow[]
  alerts: CountRow[]
  alertCategories: CountRow[]
  payloads: CapturedPayload[]
  campaigns: NetworkCampaign[]
}

// ---- Entity pages ----------------------------------------------------------

export type TimelineKind = 'event' | 'capture' | 'anomaly' | 'llm' | 'canary' | 'auth' | 'alert'

export interface TimelineItem extends Record<string, unknown> {
  id: string
  at: string
  kind: TimelineKind
  title: string
  detail?: string
  severity?: Severity
  href?: string
}

export interface SessionSummary extends Record<string, unknown> {
  id: string
  srcIp: string
  sensors: string[]
  first: string
  last: string
  events: number
  logins: number
  commands: number
  downloads: number
  recordingShasum?: string
}

export interface SourceNetwork {
  cidr: string
  asn: string
  org: string
  country: string
  neighbours: SourceProfile[]
  campaign?: NetworkCampaign
}

// ---- Entity groups (epic #25, Phase C) --------------------------------------

/** Any set of source IPs seen as one thing: a network, an ASN, a campaign, a
 * cluster, or an attacker identity. Every group page is built from this. */
export interface SourceGroup {
  members: SourceProfile[]
  events: HoneypotEvent[]
  /** Matches across honeypot, Suricata, and portbridge tunnel records. */
  totalMatches: number
  tunnelConnections: number
  first?: string
  last?: string
  sensors: CountRow[]
  countries: CountRow[]
  networks: CountRow[]
  ports: CountRow[]
  credentials: CountRow[]
  commands: CountRow[]
  payloads: CountRow[]
}

/** A signal several members share: the reason they are grouped. */
export interface SharedSignal extends Record<string, unknown> {
  id: string
  kind: 'credential' | 'fingerprint' | 'payload' | 'network' | 'asn'
  value: string
  members: string[]
}

export interface NetworkEntity {
  cidr: string
  asn: string
  org: string
  country: string
  group: SourceGroup
  campaign?: NetworkCampaign
}

export interface AsnEntity {
  asn: string
  orgs: string[]
  group: SourceGroup
}

export interface CampaignEntity {
  campaign: NetworkCampaign
  group: SourceGroup
  shared: SharedSignal[]
}

export interface ClusterEntity {
  kind: ClusterKind
  value: string
  group: SourceGroup
}

/** Why an identity merged: per signal category, how many distinct values
 * two or more of its member addresses share. A category nothing produced is
 * a zero, not missing. */
export interface IdentityFusion {
  categories: string[]
  values: number[]
  ips: string[]
}

export interface IdentityEntity {
  identity: AttackerEntity
  group: SourceGroup
  shared: SharedSignal[]
}

// ---- IOCs (epic #25, Phase E) ------------------------------------------------

export type IocHubKind = 'hash' | 'domain' | 'url' | 'credential' | 'command' | 'fingerprint' | 'cve' | 'signature' | 'username' | 'password'

export interface IocRow extends Record<string, unknown> {
  id: string
  kind: IocHubKind
  value: string
  events: number
  sources: number
  sessions: number
  last?: string
}

export interface IocEntity {
  kind: IocHubKind
  value: string
  events: HoneypotEvent[]
  group: SourceGroup
  sessions: SessionSummary[]
  payloads: CountRow[]
}

/** Which entity a timeline belongs to. */
export type TimelineEntity = 'source' | 'session' | 'network' | 'asn' | 'campaign' | 'cluster' | 'identity' | 'payload' | 'ioc'

/** Entities related to the one on screen, grouped by kind. `kind` is an
 * entity-registry kind (src/lib/entities.ts). */
export interface RelatedGroup {
  kind: string
  label: string
  items: Array<{ id: string; label?: string; note?: string }>
}
