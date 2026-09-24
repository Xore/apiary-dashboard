// Mock fixtures for Operations, Reports, Tools, and Evidence. Mutable arrays
// stand in for the stores the real mutations write to.
import type {
  AlertRecord,
  AnalysisResult,
  BaitCredential,
  CanaryToken,
  CanaryTokenType,
  CanaryTrigger,
  CapturedPayload,
  GeneratedReport,
  GpuJob,
  ReportDefinition,
  ReportTemplate,
  SensorFeed,
  SourceHealth,
  Topology,
} from '../types'
import { EVENTS, SENSORS, SOURCES } from './fixtures'
import { MOCK_NOW, createRng, hex, int, isoMinutesAgo, pick, pickSkewed } from './random'

// ---- Alerts ----------------------------------------------------------------

function buildAlerts(): AlertRecord[] {
  const rng = createRng(0xa1e7)
  const alerts: AlertRecord[] = []
  const add = (kind: string, message: string, severity: AlertRecord['severity'], link?: string) => {
    const first = int(rng, 30, 60 * 24 * 5)
    alerts.push({
      key: `${kind}:${hex(rng, 12)}`,
      kind,
      message,
      severity,
      count: int(rng, 1, 400),
      firstSeen: isoMinutesAgo(first),
      lastSeen: isoMinutesAgo(int(rng, 0, Math.min(first, 600))),
      lastNotified: rng() < 0.7 ? isoMinutesAgo(int(rng, 5, 300)) : undefined,
      acknowledged: rng() < 0.35,
      acknowledgedBy: undefined,
      link,
    })
  }
  // One YARA rule hitting many different files: the grouping case.
  for (let i = 0; i < 14; i++) {
    add('yara', `YARA payload match: ${hex(rng, 64)} rules=Mirai_Generic source=dionaea`, 'high', '/payloads')
  }
  for (let i = 0; i < 4; i++) {
    add('yara', `YARA payload match: ${hex(rng, 64)} rules=XMRig_Miner source=cowrie`, 'high', '/payloads')
  }
  for (const source of SOURCES.slice(0, 6)) {
    add('campaign', `New campaign: ${source.ip} joined a correlated network (${source.org})`, 'medium', `/events?ip=${source.ip}`)
  }
  add('sensor', 'Sensor suricata-vps-01 silent for 3h 10m', 'critical', '/source-health')
  add('sensor', 'Sensor tanner-vps-01 delayed: newest event 14m old', 'medium', '/source-health')
  add('ml', 'ML anomaly burst: 34 high-severity anomalies in 10 minutes', 'high', '/ml-anomalies?severity=high')
  add('canary', 'Canarytoken fired: AWS keys in home/deploy/.aws/credentials', 'critical', '/canarytokens')
  add('auth', 'Failed-login spike on apiary-dashboard (19 in 1h)', 'medium', '/auth-events')
  add('ingest', 'Dead letters: 12 documents rejected by Elasticsearch in 24h', 'low', '/dead-letters')
  return alerts
}

export const ALERTS: AlertRecord[] = buildAlerts()

// ---- Source health ---------------------------------------------------------

function feedFor(lastSeen: string): SensorFeed['state'] {
  const age = (MOCK_NOW - Date.parse(lastSeen)) / 60_000
  return age < 2 ? 'fresh' : age < 15 ? 'delayed' : age < 120 ? 'stale' : 'silent'
}

export const FEEDS: SensorFeed[] = [...SENSORS]
  .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
  .map((s) => ({ sensor: s.id, state: feedFor(s.lastSeen), documents: s.eventsLast24h * 173 + 4_210, lastSeen: s.lastSeen }))

export const SOURCE_HEALTH: SourceHealth = {
  clusterStatus: 'yellow',
  indexedDocuments: FEEDS.reduce((sum, f) => sum + f.documents, 0),
  feeds: FEEDS,
  ingest: { state: 'fresh', lastIngest: isoMinutesAgo(0), ageSeconds: 18, recentDeadLetters: 12 },
  yara: { enabled: true, lastScan: isoMinutesAgo(7), rulesSha256: hex(createRng(0x7a7a), 64), samples: 1_284, matched: 97, errors: 2 },
  runtime: { uptimeSeconds: 6 * 86_400 + 4 * 3_600 + 12 * 60, rssBytes: 312 * 1024 ** 2, vmBytes: 1.9 * 1024 ** 3 },
  pipeline: { state: 'running', acked: 4_812_330, failed: 12, dropped: 0, active: 38, decodeFailures: 3 },
  deadLetters: 12,
}

// ---- Topology --------------------------------------------------------------

const FLOW_NODES = [
  'Internet', 'VPS portbridge', 'Traefik', 'cowrie', 'dionaea', 'tanner', 'rdpy', 'suricata',
  'Filebeat', 'raw indices', 'ml-worker', 'correlator', 'llm-worker', 'derived indices', 'Dashboard',
]
const n = (name: string) => FLOW_NODES.indexOf(name)

export const TOPOLOGY: Topology = {
  flow: {
    nodes: FLOW_NODES.map((name) => ({ name })),
    links: [
      { source: n('Internet'), target: n('VPS portbridge'), value: 70 },
      { source: n('Internet'), target: n('Traefik'), value: 18 },
      { source: n('VPS portbridge'), target: n('cowrie'), value: 34 },
      { source: n('VPS portbridge'), target: n('dionaea'), value: 22 },
      { source: n('VPS portbridge'), target: n('rdpy'), value: 8 },
      { source: n('VPS portbridge'), target: n('suricata'), value: 6 },
      { source: n('Traefik'), target: n('tanner'), value: 18 },
      { source: n('cowrie'), target: n('Filebeat'), value: 34 },
      { source: n('dionaea'), target: n('Filebeat'), value: 22 },
      { source: n('tanner'), target: n('Filebeat'), value: 18 },
      { source: n('rdpy'), target: n('Filebeat'), value: 8 },
      { source: n('suricata'), target: n('Filebeat'), value: 6 },
      { source: n('Filebeat'), target: n('raw indices'), value: 88 },
      { source: n('raw indices'), target: n('ml-worker'), value: 30 },
      { source: n('raw indices'), target: n('correlator'), value: 40 },
      { source: n('raw indices'), target: n('llm-worker'), value: 18 },
      { source: n('ml-worker'), target: n('derived indices'), value: 30 },
      { source: n('correlator'), target: n('derived indices'), value: 40 },
      { source: n('llm-worker'), target: n('derived indices'), value: 18 },
      { source: n('derived indices'), target: n('Dashboard'), value: 88 },
    ],
  },
  sensors: [
    { sensor: 'cowrie-vps-01', ingress: ['portbridge', 'proxy'], hostnames: [], ports: [{ proto: 'tcp', public: 22, host: 2222 }, { proto: 'tcp', public: 23, host: 2223 }], rawIndex: 'honeypot-cowrie-*', feed: 'fresh' },
    { sensor: 'cowrie-home-01', ingress: ['portbridge'], hostnames: [], ports: [{ proto: 'tcp', public: 2022, host: 22 }], rawIndex: 'honeypot-cowrie-*', feed: 'fresh' },
    { sensor: 'dionaea-vps-01', ingress: ['portbridge'], hostnames: [], ports: [{ proto: 'tcp', public: 445, host: 445 }, { proto: 'tcp', public: 21, host: 21 }, { proto: 'tcp', public: 3306, host: 3306 }, { proto: 'udp', public: 5060, host: 5060 }], rawIndex: 'honeypot-dionaea-*', feed: 'fresh' },
    { sensor: 'tanner-vps-01', ingress: ['traefik'], hostnames: ['shop.example.test', 'wp.example.test'], ports: [], rawIndex: 'honeypot-tanner-*', feed: 'delayed' },
    { sensor: 'rdpy-home-01', ingress: ['portbridge'], hostnames: [], ports: [{ proto: 'tcp', public: 3389, host: 3389 }], rawIndex: 'honeypot-rdpy-*', feed: 'fresh' },
    { sensor: 'suricata-vps-01', ingress: ['direct'], hostnames: [], ports: [], rawIndex: 'suricata-*', feed: 'silent' },
  ],
  stacks: [
    { stack: 'honeypot-vps', containers: [{ name: 'hp-portbridge', state: 'running' }, { name: 'hp-traefik', state: 'running' }, { name: 'hp-suricata', state: 'exited' }, { name: 'hp-cowrie', state: 'running' }, { name: 'hp-dionaea', state: 'running' }] },
    { stack: 'honeypot-home', containers: [{ name: 'hp-cowrie-home', state: 'running' }, { name: 'hp-rdpy', state: 'running' }, { name: 'hp-tanner', state: 'restarting' }] },
    { stack: 'honeypot-elk', containers: [{ name: 'hp-elasticsearch', state: 'running' }, { name: 'hp-filebeat', state: 'running' }, { name: 'hp-kibana', state: 'running' }] },
    { stack: 'honeypot-dashboard', containers: [{ name: 'hp-dashboard-next', state: 'running' }, { name: 'hp-apiary-backend', state: 'running' }, { name: 'hp-apiary-ml-worker', state: 'running' }, { name: 'hp-apiary-correlator', state: 'running' }, { name: 'hp-apiary-llm-worker', state: 'unknown' }] },
  ],
}

// ---- Reports ---------------------------------------------------------------

export const REPORT_ELEMENTS = [
  { id: 'summary', label: 'Executive summary', description: 'Headline numbers and what changed.' },
  { id: 'timeline', label: 'Activity timeline', description: 'Events over time by protocol.' },
  { id: 'sources', label: 'Top sources', description: 'Most active addresses and networks.' },
  { id: 'credentials', label: 'Credentials', description: 'Usernames and passwords tried.' },
  { id: 'commands', label: 'Commands', description: 'Shell commands executed in sessions.' },
  { id: 'payloads', label: 'Payloads', description: 'Captured files and their verdicts.' },
  { id: 'campaigns', label: 'Campaigns', description: 'Correlated networks and identities.' },
  { id: 'attck', label: 'ATT&CK coverage', description: 'Techniques observed, by tactic.' },
  { id: 'appendix', label: 'Event appendix', description: 'Raw event rows, capped.' },
]

export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'executive', name: 'Executive briefing', description: 'Short, high-level, for leadership.', elements: ['summary', 'timeline', 'campaigns'] },
  { id: 'operations', name: 'Operations digest', description: 'Everything an analyst checks each morning.', elements: ['summary', 'timeline', 'sources', 'credentials', 'commands', 'payloads'] },
  { id: 'threat', name: 'Threat intelligence', description: 'Campaigns, identities, and techniques.', elements: ['campaigns', 'attck', 'payloads', 'sources'] },
  { id: 'incident', name: 'Incident appendix', description: 'Scoped evidence with raw events.', elements: ['summary', 'sources', 'commands', 'appendix'] },
]

const defaultBranding = { title: 'APIARY honeypot report', author: 'Operator', headerLeft: 'APIARY', headerRight: 'TLP:AMBER', footerLeft: 'Generated by APIARY', classification: 'TLP:AMBER' }
const emptyScope = { window: '24h', ip: '', sensor: '', port: '', signature: '' }

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  { id: 'def-weekly', name: 'Weekly board briefing', template: 'executive', theme: 'light', elements: ['summary', 'timeline', 'campaigns'], scope: { ...emptyScope, window: '7d' }, branding: defaultBranding, schedule: { frequency: 'weekly', hour: 6, minute: 0, weekday: 1, monthDay: 1 }, created: isoMinutesAgo(60 * 24 * 21) },
  { id: 'def-daily', name: 'Daily ops digest', template: 'operations', theme: 'dark', elements: REPORT_TEMPLATES[1].elements, scope: emptyScope, branding: defaultBranding, schedule: { frequency: 'daily', hour: 6, minute: 30, weekday: 1, monthDay: 1 }, created: isoMinutesAgo(60 * 24 * 40) },
  { id: 'def-cowrie', name: 'Cowrie deep dive', template: 'incident', theme: 'dark', elements: REPORT_TEMPLATES[3].elements, scope: { ...emptyScope, sensor: 'cowrie-vps-01', window: '7d' }, branding: defaultBranding, schedule: null, created: isoMinutesAgo(60 * 24 * 3) },
]

export const GENERATED_REPORTS: GeneratedReport[] = (() => {
  const rng = createRng(0x2e90)
  return Array.from({ length: 11 }, (_, i) => {
    const def = i % 4 === 3 ? REPORT_DEFINITIONS[2] : i % 2 ? REPORT_DEFINITIONS[0] : REPORT_DEFINITIONS[1]
    return {
      id: `rpt-${hex(rng, 10)}`,
      title: def.name,
      template: def.template,
      origin: def.schedule ? 'schedule' : 'manual',
      createdAt: isoMinutesAgo(i * 60 * 24 + int(rng, 0, 120)),
      sizeBytes: int(rng, 180, 2400) * 1024,
      definitionId: def.id,
    } satisfies GeneratedReport
  })
})()

// ---- Canarytokens ----------------------------------------------------------

export const CANARY_TYPES: CanaryTokenType[] = [
  { type: 'aws_keys', label: 'AWS API keys', description: 'Fake credentials that alert when used against AWS.' },
  { type: 'web_bug', label: 'Web bug / URL', description: 'A URL that alerts when visited.' },
  { type: 'dns', label: 'DNS hostname', description: 'A hostname that alerts when resolved.' },
  { type: 'ms_word', label: 'Word document', description: 'A .docx that alerts when opened.' },
  { type: 'pdf', label: 'PDF document', description: 'A PDF that alerts when opened in Acrobat.' },
  { type: 'kubeconfig', label: 'Kubeconfig', description: 'A cluster config that alerts when used.' },
  { type: 'qr_code', label: 'QR code', description: 'An image that alerts when scanned.', needs: 'text' },
  { type: 'clonedsite', label: 'Cloned website', description: 'Alerts when a page is served from another domain.', needs: 'text' },
]

export const CANARY_TOKENS: CanaryToken[] = (() => {
  const rng = createRng(0xca11)
  const memos = ['AWS keys in home/deploy/.aws/credentials', 'Backup script URL in /root/backup.sh', 'Fake kubeconfig in /etc/kubernetes', 'Salaries.docx on the SMB share', 'DNS name in /etc/hosts', 'Invoice PDF in ftp root']
  const types = ['aws_keys', 'web_bug', 'kubeconfig', 'ms_word', 'dns', 'pdf']
  return memos.map((memo, i) => {
    const id = hex(rng, 25)
    return {
      id,
      type: types[i],
      memo,
      url: `http://canary.example.test/${pick(rng, ['about', 'static', 'tags', 'terms'])}/${id}/index.html`,
      hostname: `${id}.canary.example.test`,
      createdAt: isoMinutesAgo(int(rng, 60 * 24, 60 * 24 * 60)),
      createdBy: 'operator',
      artifact: ['aws_keys', 'kubeconfig', 'ms_word', 'pdf'].includes(types[i]) ? `${types[i]}-${id.slice(0, 6)}` : undefined,
    }
  })
})()

export const CANARY_TRIGGERS: CanaryTrigger[] = (() => {
  const rng = createRng(0xf12e)
  return Array.from({ length: 9 }, (_, i) => {
    const token = pickSkewed(rng, CANARY_TOKENS)
    return {
      id: `hit-${hex(rng, 10)}`,
      tokenId: token.id,
      memo: token.memo,
      type: token.type,
      triggeredAt: isoMinutesAgo(i * 290 + int(rng, 0, 200)),
      srcIp: pick(rng, SOURCES).ip,
      userAgent: pick(rng, ['aws-cli/2.15.0 Python/3.11', 'curl/8.4.0', 'Microsoft Office Word 2016', 'kubectl/v1.29.1', 'python-requests/2.31']),
      location: pick(rng, ['Beijing, CN', 'Moscow, RU', 'Amsterdam, NL', 'São Paulo, BR']),
    }
  })
})()

// ---- Bait credentials ------------------------------------------------------

export const BAIT_CREDENTIALS: BaitCredential[] = [
  { id: 'cred-1', path: 'home/deploy/.aws/credentials', target: 'cowrie-vps-01', username: 'AKIAEXAMPLE7QK2M4Z', password: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLE', memo: 'AWS bait next to the deploy key', template: '[default]\naws_access_key_id={{username}}\naws_secret_access_key={{password}}', linkedTokenId: CANARY_TOKENS[0].id, createdAt: isoMinutesAgo(60 * 24 * 12), createdBy: 'operator' },
  { id: 'cred-2', path: 'root/.my.cnf', target: 'cowrie-vps-01', username: 'root', password: 'Tr0ub4dor&3x', memo: 'MySQL root in a dotfile', template: '[client]\nuser={{username}}\npassword={{password}}', createdAt: isoMinutesAgo(60 * 24 * 9), createdBy: 'operator', rotatedAt: isoMinutesAgo(60 * 24 * 2), rotatedBy: 'operator' },
  { id: 'cred-3', path: 'home/mwagner/notes.txt', target: 'cowrie-home-01', username: 'mwagner', password: 'Summer2026!', memo: 'Plain-text note a user left behind', template: 'username={{username}}\npassword={{password}}', createdAt: isoMinutesAgo(60 * 24 * 4), createdBy: 'operator' },
]

// ---- Captured payloads -----------------------------------------------------

function hexPreview(rng: () => number, kind: string): string {
  const header = kind === 'ELF' ? [0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00] : kind === 'shell script' ? [...'#!/bin/sh'].map((c) => c.charCodeAt(0)) : [0x4d, 0x5a, 0x90, 0x00]
  const bytes = [...header, ...Array.from({ length: 48 - header.length }, () => int(rng, 0, 255))]
  const lines: string[] = []
  // Eight bytes per row keeps the dump inside a card column.
  for (let offset = 0; offset < bytes.length; offset += 8) {
    const row = bytes.slice(offset, offset + 8)
    const hexPart = row.map((b) => b.toString(16).padStart(2, '0')).join(' ')
    const ascii = row.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('')
    lines.push(`${offset.toString(16).padStart(4, '0')}  ${hexPart.padEnd(23)}  ${ascii}`)
  }
  return lines.join('\n')
}

export const PAYLOADS: CapturedPayload[] = (() => {
  const rng = createRng(0xfa11)
  const downloads = EVENTS.filter((e) => e.type === 'file.download')
  return Array.from({ length: 30 }, (_, i) => {
    const kind = pickSkewed(rng, ['ELF', 'shell script', 'PE32'] as const)
    const verdictRoll = rng()
    const event = downloads[i % Math.max(1, downloads.length)] as (typeof downloads)[number] | undefined
    return {
      hash: hex(rng, 64),
      sources: Array.from(new Set([pickSkewed(rng, ['cowrie', 'dionaea', 'tanner']), ...(rng() < 0.2 ? ['suricata'] : [])])),
      kind,
      platform: kind === 'PE32' ? 'windows' : pick(rng, ['linux/x86_64', 'linux/arm', 'linux/mips']),
      mime: kind === 'shell script' ? 'text/x-shellscript' : kind === 'ELF' ? 'application/x-executable' : 'application/x-dosexec',
      sizeBytes: kind === 'shell script' ? int(rng, 300, 4000) : int(rng, 40_000, 2_400_000),
      copies: rng() < 0.3 ? int(rng, 2, 40) : 1,
      dynamic: kind !== 'shell script' || rng() < 0.3,
      preview: hexPreview(rng, kind),
      capturedAt: event?.timestamp ?? isoMinutesAgo(i * 97),
      verdict:
        verdictRoll < 0.45
          ? { label: 'malicious', family: pick(rng, ['Mirai', 'Gafgyt', 'XMRig', 'Tsunami', 'Kaiji']) }
          : verdictRoll < 0.6
            ? { label: 'suspicious' }
            : verdictRoll < 0.7
              ? { label: 'clean' }
              : undefined,
    } satisfies CapturedPayload
  }).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
})()

/** Which captured payload each download event fetched: download i fetched
 * payload i (mod the payload count), matching how PAYLOADS was derived. */
export const DOWNLOAD_HASH: ReadonlyMap<string, string> = (() => {
  const downloads = EVENTS.filter((e) => e.type === 'file.download')
  const byCapture = [...PAYLOADS]
  return new Map(
    downloads.map((e, i) => {
      const hash = byCapture[i % byCapture.length].hash
      // Keep the event's own summary consistent with the payload it links to.
      e.summary = `Payload fetched (sha256 ${hash.slice(0, 12)}…)`
      return [e.id, hash]
    }),
  )
})()

// ---- Analysis results ------------------------------------------------------

export const ANALYZERS = [
  { id: 'static', label: 'Static analysis', description: 'File type, strings, imports, entropy.', gpu: false },
  { id: 'yara', label: 'YARA', description: 'Match against the deployed rule set.', gpu: false },
  { id: 'sandbox', label: 'Sandbox detonation', description: 'Run in an isolated VM and record behavior.', gpu: false },
  { id: 'ghidra', label: 'Ghidra decompilation', description: 'Decompile and summarise with a local model.', gpu: true },
]

export const ANALYSIS_RESULTS: AnalysisResult[] = (() => {
  const rng = createRng(0x9e5b)
  const results: AnalysisResult[] = []
  PAYLOADS.slice(0, 24).forEach((payload, i) => {
    const file = `${payload.hash.slice(0, 12)}.${payload.kind === 'shell script' ? 'sh' : payload.kind === 'PE32' ? 'exe' : 'bin'}`
    const at = isoMinutesAgo(i * 70 + int(rng, 0, 50))
    results.push({ id: `static-${i}`, analyzer: 'static', hash: payload.hash, file, at, summary: `${payload.kind}, ${payload.platform}, entropy ${(5 + rng() * 2.9).toFixed(2)}`, detail: { imports: ['socket', 'connect', 'fork', 'execve'].slice(0, int(rng, 1, 4)), strings: int(rng, 40, 900) } })
    if (payload.verdict?.label === 'malicious' || rng() < 0.3) {
      const rules = [`${payload.verdict?.family ?? 'Generic'}_Bot`, ...(rng() < 0.4 ? ['UPX_Packed'] : [])]
      results.push({ id: `yara-${i}`, analyzer: 'yara', hash: payload.hash, file, at, summary: `${rules.length} rule${rules.length > 1 ? 's' : ''} matched`, matches: rules, detail: { rules } })
    }
    if (payload.dynamic && i % 2 === 0) {
      const risk = int(rng, 10, 98)
      results.push({ id: `sandbox-${i}`, analyzer: 'sandbox', hash: payload.hash, file, at, risk, platform: payload.platform, summary: risk > 70 ? 'Contacts C2, spawns shell, modifies crontab' : 'Network scan, no persistence', detail: { exitStatus: 0, dns: ['cnc.example.test'], processes: int(rng, 2, 14) } })
    }
    // Ghidra only decompiles binaries; scripts stop at static analysis.
    if (i % 3 === 0 && payload.kind !== 'shell script') {
      results.push({ id: `ghidra-${i}`, analyzer: 'ghidra', hash: payload.hash, file, at, summary: 'Main loop connects to a hardcoded host, receives commands, and launches flood attacks.', detail: { functions: int(rng, 80, 900), model: 'qwen2.5-coder:14b' } })
    }
    if (i % 4 === 0) {
      results.push({ id: `wb-${i}`, analyzer: 'workbench', hash: payload.hash, file, at, owner: 'operator', recipe: pick(rng, ['full', 'static+yara', 'sandbox-only']), state: pick(rng, ['succeeded', 'succeeded', 'running', 'failed'] as const), summary: 'Workbench run', detail: { children: 3 } })
    }
  })
  return results
})()

export const GPU_QUEUE: GpuJob[] = [
  { jobId: 'gpu-7f31', requestedAt: isoMinutesAgo(4), jobType: 'ghidra-summary', model: 'qwen2.5-coder:14b', status: 'running', attempts: 1, abortRequested: false, ref: PAYLOADS[0].hash.slice(0, 16), vramMib: 10_240 },
  { jobId: 'gpu-7f32', requestedAt: isoMinutesAgo(3), jobType: 'ghidra-summary', model: 'qwen2.5-coder:14b', status: 'queued', attempts: 0, abortRequested: false, ref: PAYLOADS[3].hash.slice(0, 16), vramMib: 10_240 },
  { jobId: 'gpu-7f33', requestedAt: isoMinutesAgo(2), jobType: 'llm-session', model: 'qwen2.5:14b-instruct', status: 'queued', attempts: 0, abortRequested: false, ref: 'session batch 18', vramMib: 9_800 },
  { jobId: 'gpu-7f2e', requestedAt: isoMinutesAgo(40), jobType: 'ghidra-summary', model: 'qwen2.5-coder:14b', status: 'failed', attempts: 3, abortRequested: false, ref: PAYLOADS[6].hash.slice(0, 16), vramMib: 10_240 },
]
