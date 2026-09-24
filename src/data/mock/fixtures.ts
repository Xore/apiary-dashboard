// Seeded mock fixtures. Attacker addresses come from the RFC 5737
// documentation ranges so mock data never names a real host.
import type { AttackSource, HoneypotEvent, ProviderClass, Sensor, SensorFields, SessionUser } from '../types'
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
  ...(spec.persona ? { persona: { id: spec.persona.id, organization: spec.persona.organization, site: spec.persona.site, assets: spec.persona.assets } } : {}),
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

/** Provider class by network, as source.as.type classifies it. */
const PROVIDER_OF: Record<string, ProviderClass> = {
  Chinanet: 'network',
  'Korea Telecom': 'network',
  DigitalOcean: 'hosting',
  Hetzner: 'hosting',
  M247: 'hosting',
  AlexHost: 'hosting',
  'Akamai Linode': 'hosting',
  Amazon: 'cloud',
  'Tencent Cloud': 'cloud',
  'Alibaba Cloud': 'cloud',
}

const CITIES: Record<string, string[]> = {
  CN: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen'],
  US: ['Ashburn', 'Santa Clara', 'New York', 'Dallas'],
  RU: ['Moscow', 'Saint Petersburg'],
  BR: ['São Paulo', 'Rio de Janeiro'],
  IN: ['Mumbai', 'Bengaluru'],
  VN: ['Hanoi', 'Ho Chi Minh City'],
  NL: ['Amsterdam'],
  DE: ['Frankfurt am Main', 'Nuremberg'],
  KR: ['Seoul'],
  ID: ['Jakarta'],
  IR: ['Tehran'],
  TW: ['Taipei'],
}

const TAGS = ['scanner', 'bruteforce', 'mirai-like', 'cryptominer', 'tor-exit', 'botnet', 'recon'] as const

export { COMMANDS, PASSWORDS, USERNAMES } from './fleet'

/** The credential pair an event offered, `user:pass`, or undefined when it
 * offered none. Some services take a password alone (VNC): `:pass`. */
export function credentialOf(e: Pick<HoneypotEvent, 'username' | 'password'>): string | undefined {
  if (e.username === undefined && e.password === undefined) return undefined
  return `${e.username ?? ''}:${e.password ?? ''}`
}

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
      provider: 'network',
      city: '',
    })
  }
  // A separate stream, so adding these never reshuffles the fixtures above.
  const geo = createRng(0xc17e)
  for (const source of sources) {
    source.city = pick(geo, CITIES[source.country])
    source.provider = source.tags.includes('scanner') && geo() < 0.5 ? 'scanner' : geo() < 0.03 ? 'blocklist:spamhaus' : PROVIDER_OF[source.org]
  }
  return sources
}

/** The pivots the pipeline reads off a sensor's own fields: a fingerprint
 * (canonical first, then HASSH, SSH pubkey, client banner, User-Agent), the
 * ATT&CK techniques, the payload class, and DNP3 control severity. */
function pivotsOf(fields: SensorFields): Pick<HoneypotEvent, 'fingerprint' | 'fingerprintKind' | 'techniques' | 'payloadClass' | 'icsSeverity'> {
  const text = (key: string) => (typeof fields[key] === 'string' ? (fields[key]) : '')
  const [fingerprint, fingerprintKind] = text('canonical_fingerprint')
    ? [text('canonical_fingerprint'), text('canonical_fingerprint_kind') || 'fingerprint']
    : text('hassh')
      ? [text('hassh'), 'HASSH']
      : text('fingerprint')
        ? [text('fingerprint'), 'SSH pubkey']
        : text('client')
          ? [text('client'), 'client banner']
          : text('user_agent')
            ? [text('user_agent'), 'User-Agent']
            : ['', '']
  const app = text('app_function')
  const icsSeverity = ['direct_operate', 'direct_operate_no_ack'].includes(app) ? 'critical' : ['select', 'operate', 'cold_restart', 'warm_restart', 'initialize_application', 'save_configuration', 'write'].includes(app) ? 'high' : undefined
  const techniques = Array.isArray(fields.canonical_attck_techniques) ? fields.canonical_attck_techniques.filter((t): t is string => typeof t === 'string') : []
  return {
    ...(fingerprint ? { fingerprint, fingerprintKind } : {}),
    techniques,
    ...(text('payload_class') ? { payloadClass: text('payload_class') } : {}),
    ...(icsSeverity ? { icsSeverity } : {}),
  }
}

function buildEvents(sources: AttackSource[]): HoneypotEvent[] {
  const rng = createRng(0xbee5)
  const decoy = createRng(0xdec0)
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
      const { type, severity, protocol, dstPort, eventName, summary, fields: own, username, password, command } = spec.generate(rng, sessionId)
      // The decoy identity rides along in the sensor's own fields, as the
      // enrichment step writes it.
      const persona = spec.persona && decoy() < (spec.persona.share ?? 1) ? spec.persona : undefined
      const asset = persona ? (persona.assetFor?.(own) ?? persona.assets[0]) : undefined
      const fields: SensorFields = persona && asset ? { ...own, persona_id: persona.id, site_id: persona.site, asset_id: asset, organization: persona.organization } : own
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
        ...(persona && asset ? { persona: persona.id, site: persona.site, asset, organization: persona.organization } : {}),
        ...pivotsOf(fields),
        org: source.org,
        provider: source.provider,
        city: source.city,
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
