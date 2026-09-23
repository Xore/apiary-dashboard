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
