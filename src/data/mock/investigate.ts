// Mock fixtures for the Investigate section. Everything that can be derived
// from the shared event set is, so counts agree across pages.
import type {
  AttackerEntity,
  ClusterKind,
  CredEdge,
  HoneypotEvent,
  InfraCluster,
  KillChainData,
  NetworkCampaign,
  Recording,
  Replay,
  SourceProfile,
} from '../types'
import { COMMANDS, EVENTS, SOURCES } from './fixtures'
import { createRng, hex, int, isoMinutesAgo, pick } from './random'

const unique = <T,>(values: T[]) => [...new Set(values)]

function byKey<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(item)
  }
  return groups
}

// Approximate country centroids for the attack-origins map.
export const COUNTRY_CENTROIDS: Record<string, [lat: number, lon: number]> = {
  CN: [35.9, 104.2],
  US: [39.8, -98.6],
  RU: [61.5, 105.3],
  BR: [-14.2, -51.9],
  IN: [20.6, 78.9],
  VN: [14.1, 108.3],
  NL: [52.1, 5.3],
  DE: [51.2, 10.5],
  KR: [35.9, 127.8],
  ID: [-0.8, 113.9],
  IR: [32.4, 53.7],
  TW: [23.7, 121.0],
}

// ---- Source profiles -------------------------------------------------------

const eventsBySource = byKey(EVENTS, (e) => e.srcIp)

export const SOURCE_PROFILES: SourceProfile[] = SOURCES.filter((s) => s.events > 0)
  .map((source) => {
    const events = eventsBySource.get(source.ip) ?? []
    return {
      ip: source.ip,
      country: source.country,
      org: source.org,
      events: events.length,
      logins: events.filter((e) => e.type === 'login.failed' || e.type === 'login.success').length,
      sessions: source.sessions,
      sensors: unique(events.map((e) => e.sensor)),
      first: source.firstSeen,
      last: source.lastSeen,
    }
  })
  .sort((a, b) => b.events - a.events)

// ---- Network campaigns (/26 networks) --------------------------------------

function cidr26(ip: string): string {
  const parts = ip.split('.')
  return `${parts.slice(0, 3).join('.')}.${Math.floor(Number(parts[3]) / 64) * 64}/26`
}

const TACTIC_SEQUENCE = ['reconnaissance', 'initial-access', 'execution', 'persistence', 'command-and-control']

function buildCampaigns(): NetworkCampaign[] {
  const rng = createRng(0xc1d7)
  return [...byKey(EVENTS, (e) => cidr26(e.srcIp))]
    .map(([cidr, events]) => {
      const ips = unique(events.map((e) => e.srcIp))
      const sources = SOURCES.filter((s) => ips.includes(s.ip))
      const creds = unique(events.filter((e) => e.password).map((e) => `${e.username}:${e.password}`)).length
      const payloads = events.filter((e) => e.type === 'file.download').length
      const alerts = events.filter((e) => e.type === 'ids.alert').length
      const sensors = unique(events.map((e) => e.sensor))
      const ports = unique(events.map((e) => e.dstPort)).sort((a, b) => a - b)
      const score = Math.min(99, Math.round(Math.log2(events.length + 1) * 6 + ips.length * 2 + sensors.length * 3 + payloads * 4 + alerts * 2))
      const scanRoll = rng()
      // Correlated at some point inside the rolling 7-day window.
      const first = isoMinutesAgo(int(rng, 26 * 60, 7 * 24 * 60))
      return {
        cidr,
        score,
        events: events.length,
        uniqueIps: ips.length,
        sensors,
        ports,
        creds,
        payloads,
        alerts,
        providers: unique(sources.map((s) => s.org)),
        asns: unique(sources.map((s) => s.asn)),
        fingerprints: int(rng, 1, 6),
        explanation: `${ips.length} addresses in ${cidr} hit ${sensors.length} sensors on ${ports.length} ports${creds ? `, reusing ${creds} credential pairs` : ''}${payloads ? `, delivering ${payloads} payloads` : ''}.`,
        sequence: TACTIC_SEQUENCE.slice(0, int(rng, 2, 5)),
        scan: scanRoll < 0.2 ? 'horizontal' : scanRoll < 0.3 ? 'vertical' : undefined,
        dstIpsTouched: int(rng, 1, 40),
        portsTouched: ports.length,
        first,
        last: events[0].timestamp,
      } satisfies NetworkCampaign
    })
    .filter((c) => c.uniqueIps >= 2)
    .sort((a, b) => b.score - a.score)
}

export const NETWORK_CAMPAIGNS: NetworkCampaign[] = buildCampaigns()

export const CRED_REUSE: CredEdge[] = [...byKey(EVENTS.filter((e) => e.password), (e) => `${e.username}:${e.password}`)]
  .map(([pair, events]) => {
    const [user, pass] = pair.split(':')
    return {
      id: pair,
      user,
      pass,
      uniqueIps: unique(events.map((e) => e.srcIp)).length,
      sensors: unique(events.map((e) => e.sensor)),
      events: events.length,
      last: events[0].timestamp,
    }
  })
  .filter((edge) => edge.uniqueIps >= 2)
  .sort((a, b) => b.uniqueIps - a.uniqueIps)
  .slice(0, 25)

// ---- Infrastructure clusters -----------------------------------------------

function buildClusters(): InfraCluster[] {
  const rng = createRng(0xc105)
  const clusters: InfraCluster[] = []
  const add = (kind: ClusterKind, value: string, ips: string[]) => {
    const events = ips.reduce((sum, ip) => sum + (eventsBySource.get(ip)?.length ?? 0), 0)
    const sensors = unique(ips.flatMap((ip) => (eventsBySource.get(ip) ?? []).map((e) => e.sensor)))
    clusters.push({ id: `${kind}:${value}`, kind, value, sources: ips.length, events, sensors })
  }
  for (const [asn, sources] of byKey(SOURCES, (s) => s.asn)) {
    if (sources.length >= 2) add('asn', asn, sources.map((s) => s.ip))
  }
  for (const [org, sources] of byKey(SOURCES, (s) => s.org)) {
    if (sources.length >= 4) add('provider', org, sources.map((s) => s.ip))
  }
  for (const edge of CRED_REUSE.slice(0, 8)) {
    const ips = unique(EVENTS.filter((e) => `${e.username}:${e.password}` === edge.id).map((e) => e.srcIp))
    add('credential', edge.id, ips)
  }
  for (let i = 0; i < 10; i++) {
    const ips = unique(Array.from({ length: int(rng, 2, 9) }, () => pick(rng, SOURCES).ip))
    add(i % 2 ? 'payload' : 'fingerprint', i % 2 ? hex(rng, 64) : `hassh:${hex(rng, 32)}`, ips)
  }
  return clusters.sort((a, b) => b.sources - a.sources)
}

export const INFRA_CLUSTERS: InfraCluster[] = buildClusters()

// ---- Attacker entities -----------------------------------------------------

const TECHNIQUES = ['T1110.001', 'T1059.004', 'T1105', 'T1053.003', 'T1098.004', 'T1082', 'T1496', 'T1070.003']
const VERDICTS = ['mirai-variant', 'xmrig-dropper', 'gafgyt', 'perl-ircbot']

function buildAttackers(): AttackerEntity[] {
  const rng = createRng(0xa77a)
  const pool = [...SOURCES].filter((s) => s.events > 0)
  return Array.from({ length: 42 }, (_, index): AttackerEntity => {
    const size = index < 14 ? int(rng, 2, 7) : 1
    const members = unique(Array.from({ length: size }, () => pick(rng, pool)))
    const events = members.flatMap((m) => eventsBySource.get(m.ip) ?? [])
    const creds = unique(events.filter((e) => e.password).map((e) => `${e.username}:${e.password}`)).slice(0, 8)
    const scanRoll = rng()
    const firstTimes = members.map((m) => m.firstSeen).sort()
    const lastTimes = members.map((m) => m.lastSeen).sort()
    return {
      id: `${hex(rng, 8)}-${hex(rng, 4)}-${hex(rng, 4)}-${hex(rng, 4)}-${hex(rng, 12)}`,
      ips: members.map((m) => m.ip),
      fingerprints: Array.from({ length: int(rng, 0, 3) }, () => `hassh:${hex(rng, 32)}`),
      payloads: Array.from({ length: rng() < 0.4 ? int(rng, 1, 3) : 0 }, () => hex(rng, 64)),
      credentials: creds,
      sensors: unique(events.map((e) => e.sensor)),
      events: events.length,
      first: firstTimes[0],
      last: lastTimes.at(-1)!,
      updated: isoMinutesAgo(int(rng, 1, 120)),
      verdicts: rng() < 0.25 ? [pick(rng, VERDICTS)] : [],
      techniques: unique(Array.from({ length: int(rng, 1, 5) }, () => pick(rng, TECHNIQUES))),
      scan: scanRoll < 0.15 ? 'horizontal' : scanRoll < 0.22 ? 'vertical' : undefined,
      destIps: int(rng, 1, 60),
      portsTouched: int(rng, 1, 30),
    }
  }).sort((a, b) => b.ips.length - a.ips.length || b.events - a.events)
}

export const ATTACKERS: AttackerEntity[] = buildAttackers()

// ---- Kill chain ------------------------------------------------------------

const TACTICS = ['Reconnaissance', 'Initial Access', 'Execution', 'Persistence', 'Defense Evasion', 'Command and Control', 'Impact']
const COVERAGE: Array<[tactic: string, technique: string, name: string]> = [
  ['Reconnaissance', 'T1595', 'Active Scanning'],
  ['Reconnaissance', 'T1592', 'Gather Victim Host Info'],
  ['Initial Access', 'T1110.001', 'Password Guessing'],
  ['Initial Access', 'T1078', 'Valid Accounts'],
  ['Initial Access', 'T1190', 'Exploit Public-Facing App'],
  ['Execution', 'T1059.004', 'Unix Shell'],
  ['Execution', 'T1203', 'Exploitation for Execution'],
  ['Persistence', 'T1053.003', 'Cron'],
  ['Persistence', 'T1098.004', 'SSH Authorized Keys'],
  ['Defense Evasion', 'T1070.003', 'Clear Command History'],
  ['Defense Evasion', 'T1222', 'File Permissions Modification'],
  ['Command and Control', 'T1105', 'Ingress Tool Transfer'],
  ['Command and Control', 'T1071.001', 'Web Protocols'],
  ['Impact', 'T1496', 'Resource Hijacking'],
]

function buildKillChain(): KillChainData {
  const rng = createRng(0x4c11)
  const links: KillChainData['flow']['links'] = []
  let volume = 900
  for (let i = 0; i < TACTICS.length - 1; i++) {
    volume = Math.round(volume * (0.45 + rng() * 0.35))
    links.push({ source: i, target: i + 1, value: volume })
    // Some flows skip a stage (e.g. straight from access to C2).
    if (i + 2 < TACTICS.length && rng() < 0.6) {
      links.push({ source: i, target: i + 2, value: Math.round(volume * (0.1 + rng() * 0.2)) })
    }
  }
  return {
    tactics: TACTICS,
    flow: { nodes: TACTICS.map((name) => ({ name })), links },
    timeline: NETWORK_CAMPAIGNS.slice(0, 14).map((c) => ({ cidr: c.cidr, first: c.first, last: c.last, events: c.events })),
    coverage: COVERAGE.map(([tactic, technique, name]) => ({
      tactic,
      technique,
      name,
      events: Math.round(2 ** (rng() * 11)),
    })),
  }
}

export const KILL_CHAIN: KillChainData = buildKillChain()

// ---- Recordings ------------------------------------------------------------

const PROMPT = 'root@svr04:~# '

function buildRecordings(): { recordings: Recording[]; replays: Map<string, Replay> } {
  const rng = createRng(0x77e0)
  const sessions = [...byKey(EVENTS.filter((e) => e.type === 'command.input'), (e) => e.sessionId)]
  const replays = new Map<string, Replay>()
  // Bot traffic is repetitive: many sessions share one content-addressed
  // recording, so a small pool of transcripts backs every session.
  const pool = Array.from({ length: 9 }, () => {
    const commands = Array.from({ length: int(rng, 2, 6) }, () => pick(rng, COMMANDS))
    const transcript = commands.map((c) => `${PROMPT}${c}\n${c.startsWith('uname') ? 'Linux svr04 3.2.0-4-amd64 #1 SMP Debian 3.2.68-1+deb7u1 x86_64 GNU/Linux\n' : ''}`).join('') + PROMPT + 'exit\n'
    const shasum = hex(rng, 64)
    replays.set(shasum, { shasum, frames: int(rng, 40, 900), durationSeconds: 3 + rng() * 120, transcript })
    return shasum
  })
  const recordings = sessions.map(([session, events]: [string, HoneypotEvent[]]) => {
    const shasum = pick(rng, pool)
    const unattributed = rng() < 0.05
    return {
      id: session,
      when: events[0].timestamp,
      srcIp: unattributed ? undefined : events[0].srcIp,
      country: unattributed ? undefined : events[0].country,
      session,
      shasum,
      sizeBytes: int(rng, 900, 64_000),
      durationMs: Math.round(replays.get(shasum)!.durationSeconds * 1000),
    }
  })
  return { recordings, replays }
}

const built = buildRecordings()
export const RECORDINGS: Recording[] = built.recordings
export const REPLAYS: Map<string, Replay> = built.replays
