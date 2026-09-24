// Seeded mock fixtures. Attacker addresses come from the RFC 5737
// documentation ranges so mock data never names a real host.
import type { AttackSource, HoneypotEvent, Sensor, SessionUser } from '../types'
import { FLEET } from './fleet'
import { createRng, hex, int, isoMinutesAgo, pick, pickSkewed } from './random'

export const MOCK_USER: SessionUser = {
  name: 'Operator',
  email: 'operator@example.test',
  roles: ['admin'],
}

/** The fleet, as the catalog lists it: one entry per `event.sensor` name. */
export const SENSORS: Sensor[] = FLEET.map((spec) => ({
  id: spec.id,
  name: spec.id,
  kind: spec.kind,
  what: spec.what,
  protocols: spec.protocols,
  ports: spec.ports,
  location: spec.ingress.includes('direct') ? 'VPS edge' : 'Home lab',
  status: spec.status,
  eventsLast24h: 0,
  lastSeen: isoMinutesAgo(spec.lastSeenMinutes),
}))

const COUNTRIES = ['CN', 'US', 'RU', 'BR', 'IN', 'VN', 'NL', 'DE', 'KR', 'ID', 'IR', 'TW'] as const

const ORGS = [
  ['AS4134', 'Chinanet'],
  ['AS14061', 'DigitalOcean'],
  ['AS16509', 'Amazon'],
  ['AS45090', 'Tencent Cloud'],
  ['AS9009', 'M247'],
  ['AS24940', 'Hetzner'],
  ['AS37963', 'Alibaba Cloud'],
  ['AS200019', 'AlexHost'],
  ['AS4766', 'Korea Telecom'],
  ['AS63949', 'Akamai Linode'],
] as const

const TAGS = ['scanner', 'bruteforce', 'mirai-like', 'cryptominer', 'tor-exit', 'botnet', 'recon'] as const

export { COMMANDS, PASSWORDS, USERNAMES } from './fleet'

function buildSources(): AttackSource[] {
  const rng = createRng(0xa11a)
  const prefixes = ['192.0.2', '198.51.100', '203.0.113']
  const seen = new Set<string>()
  const sources: AttackSource[] = []
  while (sources.length < 140) {
    const ip = `${pick(rng, prefixes)}.${int(rng, 1, 254)}`
    if (seen.has(ip)) continue
    seen.add(ip)
    const [asn, org] = pickSkewed(rng, ORGS)
    const firstSeen = int(rng, 60, 60 * 24 * 40)
    sources.push({
      ip,
      country: pickSkewed(rng, COUNTRIES),
      asn,
      org,
      events: 0,
      sessions: 0,
      firstSeen: isoMinutesAgo(firstSeen),
      lastSeen: isoMinutesAgo(firstSeen),
      riskScore: int(rng, 5, 99),
      tags: rng() < 0.7 ? [pick(rng, TAGS), ...(rng() < 0.3 ? [pick(rng, TAGS)] : [])] : [],
    })
  }
  return sources
}

function buildEvents(sources: AttackSource[]): HoneypotEvent[] {
  const rng = createRng(0xbee5)
  const events: HoneypotEvent[] = []
  // Cowrie-style hex session ids, stable per (source, connection slot).
  const sessionRng = createRng(0x5e55)
  const sessionIds = new Map<string, string>()
  const sessionIdFor = (key: string) => {
    if (!sessionIds.has(key)) sessionIds.set(key, hex(sessionRng, 12))
    return sessionIds.get(key)!
  }
  for (const spec of FLEET) {
    for (let i = 0; i < spec.perDay; i++) {
      // Denser traffic in recent hours with a mid-window burst, never newer
      // than the sensor's own last event (a silent sensor stays silent).
      const hour = Math.floor(24 * (1 - rng() ** 1.25))
      const burst = rng() < 0.12 ? int(rng, 300, 420) : 0
      const minutesAgo = Math.max(spec.lastSeenMinutes, burst || int(rng, 0, 59) + hour * 60)
      const source = pickSkewed(rng, sources)
      const sessionId = sessionIdFor(`${spec.id}#${source.ip}#${int(rng, 1, 6)}`)
      const { type, severity, protocol, dstPort, eventName, summary, fields, username, password, command } = spec.generate(rng, sessionId)
      events.push({
        id: `evt-${hex(rng, 10)}`,
        timestamp: isoMinutesAgo(Math.min(minutesAgo, 24 * 60 - 1)),
        sensor: spec.id,
        protocol,
        type,
        severity,
        srcIp: source.ip,
        srcPort: int(rng, 1024, 65535),
        dstPort,
        country: source.country,
        asn: source.asn,
        sessionId,
        summary,
        eventName,
        fields,
        ...(username !== undefined ? { username } : {}),
        ...(password !== undefined ? { password } : {}),
        ...(command !== undefined ? { command } : {}),
      })
    }
  }
  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  // Roll per-source and per-sensor counters up from the events so every view
  // of the mock data agrees with every other.
  const bySource = new Map(sources.map((s) => [s.ip, s]))
  const sessions = new Map<string, Set<string>>()
  for (const event of events) {
    const source = bySource.get(event.srcIp)!
    source.events += 1
    if (event.timestamp > source.lastSeen) source.lastSeen = event.timestamp
    if (!sessions.has(source.ip)) sessions.set(source.ip, new Set())
    sessions.get(source.ip)!.add(event.sessionId)
    const sensor = SENSORS.find((s) => s.id === event.sensor)!
    sensor.eventsLast24h += 1
  }
  for (const source of sources) source.sessions = sessions.get(source.ip)?.size ?? 0
  return events
}

export const SOURCES: AttackSource[] = buildSources()
export const EVENTS: HoneypotEvent[] = buildEvents(SOURCES)
