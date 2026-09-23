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
