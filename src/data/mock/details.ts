// Mock fixtures behind the drill-down and unlisted pages. Detail lookups are
// computed from the shared event set; the rest is small seeded data.
import type {
  AuditEntry,
  ConfigRevision,
  DeadLetter,
  HoneypotEvent,
  Preferences,
  ProblemReport,
  ServiceStatus,
  Technique,
} from '../types'
import { TOPOLOGY } from './operations'
import { createRng, hex, int, isoMinutesAgo, pick } from './random'

// ---- ATT&CK mapping --------------------------------------------------------

const RULES: Array<{ test: (e: HoneypotEvent) => boolean; id: string; name: string; tactic: string }> = [
  { test: (e) => e.type === 'connection', id: 'T1595', name: 'Active Scanning', tactic: 'Reconnaissance' },
  { test: (e) => e.type === 'login.failed', id: 'T1110.001', name: 'Password Guessing', tactic: 'Credential Access' },
  { test: (e) => e.type === 'login.success', id: 'T1078', name: 'Valid Accounts', tactic: 'Initial Access' },
  { test: (e) => e.type === 'command.input', id: 'T1059.004', name: 'Unix Shell', tactic: 'Execution' },
  { test: (e) => /uname|cpuinfo|nproc|free -m/.test(e.command ?? ''), id: 'T1082', name: 'System Information Discovery', tactic: 'Discovery' },
  { test: (e) => /wget|curl/.test(e.command ?? '') || e.type === 'file.download', id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control' },
  { test: (e) => /chpasswd/.test(e.command ?? ''), id: 'T1098', name: 'Account Manipulation', tactic: 'Persistence' },
  { test: (e) => /\.ssh/.test(e.command ?? ''), id: 'T1098.004', name: 'SSH Authorized Keys', tactic: 'Persistence' },
  { test: (e) => /crontab/.test(e.command ?? ''), id: 'T1053.003', name: 'Cron', tactic: 'Persistence' },
  { test: (e) => /history -c|bash_history/.test(e.command ?? ''), id: 'T1070.003', name: 'Clear Command History', tactic: 'Defense Evasion' },
  { test: (e) => e.type === 'http.request', id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
]

/** ATT&CK techniques evidenced by a set of events, most frequent first. */
export function techniquesFor(events: HoneypotEvent[]): Technique[] {
  return RULES.map((rule) => ({ id: rule.id, name: rule.name, tactic: rule.tactic, events: events.filter(rule.test).length }))
    .filter((t) => t.events > 0)
    .sort((a, b) => b.events - a.events)
}

// ---- IP blocklist ----------------------------------------------------------

export const BLOCKED_IPS = new Set<string>()

// ---- Dead letters ----------------------------------------------------------

export const DEAD_LETTERS: DeadLetter[] = (() => {
  const rng = createRng(0xdead)
  const reasons = [
    ['mapper_parsing_exception', "failed to parse field [source.port] of type [long]: For input string: \"-\""],
    ['illegal_argument_exception', 'mapper [honeypot.data] cannot be changed from type [text] to [object]'],
    ['document_parsing_exception', "[1:318] failed to parse field [event.created] of type [date]"],
    ['validation_exception', 'Validation Failed: 1: this action would add [1] shards, but this cluster currently has [1000]/[1000] maximum normal shards open'],
  ]
  return Array.from({ length: 12 }, (_, i) => {
    const [kind, message] = pick(rng, reasons)
    const logset = pick(rng, ['dionaea', 'tanner', 'cowrie', 'multipot', 'conpot-s7-1200', 'hellpot'])
    return {
      id: `dl-${hex(rng, 10)}`,
      timestamp: isoMinutesAgo(i * 110 + int(rng, 0, 90)),
      reason: `${kind}: ${message}`,
      source: logset,
      index: logset === 'dionaea' ? 'dionaea-incidents-v1-2026.09.23' : '.ds-honeypot-v2-2026.09.23-000001',
      document: { '@timestamp': isoMinutesAgo(i * 110), 'source.port': '-', 'honeypot.sensor': logset, message: 'raw line kept for remediation' },
    }
  })
})()

// ---- Problem reports -------------------------------------------------------

export const PROBLEM_REPORTS: ProblemReport[] = [
  {
    id: 'pr-1',
    submittedAt: isoMinutesAgo(95),
    submittedBy: 'operator',
    status: 'open',
    page: '/events?country=CN',
    expected: 'Country filter keeps the selected sensor filter',
    actual: 'Sensor filter was cleared after choosing a country',
    consoleErrors: [],
    networkFailures: [],
    apiCalls: [{ method: 'GET', path: '/api/v1/events?country=CN', status: 200 }],
    actionTrail: ['select sensor cowrie', 'select country CN', 'observe table'],
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/140',
    hasSnapshot: true,
  },
  {
    id: 'pr-2',
    submittedAt: isoMinutesAgo(60 * 26),
    submittedBy: 'analyst',
    status: 'triaged',
    page: '/payloads/…',
    expected: 'Hex preview renders',
    actual: 'Preview area empty for a 0-byte file',
    consoleErrors: ["TypeError: Cannot read properties of undefined (reading 'slice')"],
    networkFailures: [],
    apiCalls: [{ method: 'GET', path: '/api/v1/payloads/e3b0c442…', status: 200 }],
    actionTrail: ['open payload', 'switch to Content tab'],
    userAgent: 'Mozilla/5.0 (Macintosh) Safari/18',
    hasSnapshot: false,
  },
  {
    id: 'pr-3',
    submittedAt: isoMinutesAgo(60 * 24 * 4),
    submittedBy: 'operator',
    status: 'fixed',
    page: '/reports',
    expected: 'Generate produces a PDF',
    actual: '502 from the reports worker',
    consoleErrors: [],
    networkFailures: ['POST /api/v1/reports/def-daily/generate 502'],
    apiCalls: [{ method: 'POST', path: '/api/v1/reports/def-daily/generate', status: 502 }],
    actionTrail: ['open library', 'click generate'],
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/131',
    hasSnapshot: true,
  },
]

// ---- Settings --------------------------------------------------------------

export const PREFERENCES: Preferences = {
  theme: 'system',
  density: 'comfortable',
  motion: 'system',
  landing: '/',
  rowsPerPage: 25,
  openDetailsInNewTab: false,
  timezone: 'UTC',
  clock: 'h24',
  timestamps: 'absolute',
  refreshSeconds: 30,
  notifyCritical: true,
  notifyCanary: true,
  defaultWindow: '24h',
}

export const SERVICES: ServiceStatus[] = TOPOLOGY.stacks.flatMap((stack) =>
  stack.containers.map((c, i) => ({
    name: c.name,
    stack: stack.stack,
    state: c.state,
    uptime: c.state === 'running' ? `${2 + i}d ${3 + i}h` : '—',
    image: `${c.name.replace(/^hp-/, 'apiary/')}:latest`,
  })),
)

export const CONFIG_HISTORY: ConfigRevision[] = [
  { id: 'rev-41', at: isoMinutesAgo(60 * 5), actor: 'operator', section: 'behavior', summary: 'Default window 6h → 24h' },
  { id: 'rev-40', at: isoMinutesAgo(60 * 30), actor: 'operator', section: 'honeypot', summary: 'Alert cooldown 30 → 60 minutes' },
  { id: 'rev-39', at: isoMinutesAgo(60 * 24 * 3), actor: 'operator', section: 'branding', summary: 'Notice text updated' },
  { id: 'rev-38', at: isoMinutesAgo(60 * 24 * 9), actor: 'analyst', section: 'report-presets', summary: 'Renamed “Ops digest” preset' },
]

export const AUDIT_LOG: AuditEntry[] = [
  { id: 'a-7', at: isoMinutesAgo(60 * 5), actor: 'operator', action: 'config.save', fields: ['behavior.default_window'], result: 'ok' },
  { id: 'a-6', at: isoMinutesAgo(60 * 6), actor: 'analyst', action: 'config.save', fields: ['honeypot.sandbox_concurrency'], result: 'rejected' },
  { id: 'a-5', at: isoMinutesAgo(60 * 30), actor: 'operator', action: 'config.save', fields: ['honeypot.alert_cooldown'], result: 'ok' },
  { id: 'a-4', at: isoMinutesAgo(60 * 48), actor: 'operator', action: 'service.restart', fields: ['hp-tanner'], result: 'ok' },
  { id: 'a-3', at: isoMinutesAgo(60 * 24 * 3), actor: 'operator', action: 'config.save', fields: ['branding.notice'], result: 'ok' },
]

export const SETTINGS_ADMIN = {
  branding: { productName: 'APIARY', helpUrl: 'https://example.test/runbook', notice: '', footer: 'APIARY honeypot platform' },
  honeypot: { alertCooldownMinutes: 60, blocklistTtlHours: 72, sandboxConcurrency: 2, llmDailyReport: false },
}
