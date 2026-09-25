// Mock data behind the Overview's five views. Leaderboards come from the
// shared event set; fleet-level series the events can't express (netflow,
// fingerprint families, tarpit dwell) are seeded here.
import type { CountRow, OverviewViews, SeriesPoint } from '../types'
import { EVENTS, SENSORS, SOURCES } from './fixtures'
import { COUNTRY_CENTROIDS, NETWORK_CAMPAIGNS } from './investigate'
import { FEEDS, PAYLOADS } from './operations'
import { MOCK_NOW, createRng, int } from './random'

const HOUR = 3_600_000

function rows(pairs: Array<[string, number]>): CountRow[] {
  return pairs.map(([label, count]) => ({ id: label, label, count }))
}

function countBy(values: Array<string | undefined>, limit = 10): CountRow[] {
  const counts = new Map<string, number>()
  for (const v of values) if (v !== undefined) counts.set(v, (counts.get(v) ?? 0) + 1)
  return rows([...counts].sort((a, b) => b[1] - a[1]).slice(0, limit))
}

/** Seeded leaderboard: fixed labels, skewed counts, largest first. */
function seededRows(seed: number, labels: string[], max: number): CountRow[] {
  const rng = createRng(seed)
  return rows(labels.map((label, i): [string, number] => [label, Math.max(1, Math.round((max / (i + 1)) * (0.7 + rng() * 0.6)))]).sort((a, b) => b[1] - a[1]))
}

/** Seeded series over the last `days` days in `stepHours` buckets. */
function series(seed: number, days: number, stepHours: number, keys: Record<string, [base: number, spread: number]>): SeriesPoint[] {
  const rng = createRng(seed)
  const n = (days * 24) / stepHours
  return Array.from({ length: n }, (_, i) => {
    const point: SeriesPoint = { time: new Date(MOCK_NOW - (n - i) * stepHours * HOUR).toISOString() }
    // A daily rhythm plus noise, so the lines read like traffic.
    const daily = 1 + 0.35 * Math.sin(((i * stepHours) / 24) * 2 * Math.PI)
    for (const [key, [base, spread]] of Object.entries(keys)) point[key] = Math.round(base * daily + rng() * spread)
    return point
  })
}

function buildViews(): OverviewViews {
  const hourOf = (ts: string) => Math.min(23, 23 - Math.floor((MOCK_NOW - Date.parse(ts)) / HOUR))
  const heatmap = SENSORS.map((s) => {
    const cells = new Array<number>(24).fill(0)
    for (const e of EVENTS) if (e.sensor === s.id) cells[hourOf(e.timestamp)] += 1
    return { sensor: s.id, cells }
  })
  const vectors = Object.fromEntries(
    SENSORS.map((s) => {
      const events = EVENTS.filter((e) => e.sensor === s.id)
      return [s.id, { ports: countBy(events.map((e) => String(e.dstPort))), protocols: countBy(events.map((e) => e.protocol)) }]
    }),
  )
  const byCountry = countBy(EVENTS.map((e) => e.country), 50)
  const sourcesByCountry = countBy(SOURCES.map((s) => s.country), 50)
  const mapPoints = byCountry.flatMap((row) => {
    const c = COUNTRY_CENTROIDS[row.label] as [number, number] | undefined
    return c ? [{ country: row.label, lat: c[0], lon: c[1], events: row.count, ips: sourcesByCountry.find((r) => r.label === row.label)?.count ?? 0 }] : []
  })
  const orgByIp = new Map(SOURCES.map((s) => [s.ip, s]))

  return {
    heatmap,
    vectors,
    mapPoints,
    feeds: FEEDS,
    protocols: countBy(EVENTS.map((e) => e.protocol)),
    mlBacklog: series(0x1b1, 7, 6, { classified: [420, 90], pending: [60, 70] }),
    topIps: countBy(EVENTS.map((e) => e.srcIp)),
    topPorts: countBy(EVENTS.map((e) => String(e.dstPort))),
    countries: byCountry.slice(0, 10),
    asns: countBy(EVENTS.map((e) => `${e.asn} ${orgByIp.get(e.srcIp)?.org ?? ''}`.trim())),
    providers: seededRows(0x9a0, ['hosting / datacenter', 'residential ISP', 'mobile carrier', 'VPN / proxy', 'Tor exit', 'education'], 900),
    netflowBytes: series(0x2b2, 7, 3, { bytes: [48_000_000, 22_000_000] }),
    netflowPackets: series(0x3c3, 7, 3, { packets: [61_000, 28_000] }),
    conformance: series(0x4d4, 7, 6, { http: [30, 25], smb: [12, 14], sip: [6, 9] }),
    cves: seededRows(0x5e5, ['CVE-2017-0144 EternalBlue', 'CVE-2021-44228 Log4Shell', 'CVE-2017-9841 PHPUnit RCE', 'CVE-2018-10562 GPON', 'CVE-2023-1389 TP-Link', 'CVE-2014-6271 Shellshock', 'CVE-2020-8958 Netlink GPON', 'MS-SQL brute force (named incident)'], 340),
    credentials: countBy(EVENTS.map((e) => (e.username ? `${e.username} / ${e.password}` : undefined))),
    commands: countBy(EVENTS.map((e) => e.command)),
    clients: seededRows(0x6f6, ['SSH-2.0-Go', 'SSH-2.0-libssh_0.9.6', 'SSH-2.0-PuTTY_Release_0.78', 'SSH-2.0-OpenSSH_8.9p1', 'SSH-2.0-paramiko_3.4.0', 'SSH-2.0-ZGrab ZGrab SSH Survey'], 520),
    fingerprints: seededRows(0x707, ['hassh 16f898dd8ed8279e1055350b4e20666c', 'ja3 e7d705a3286e19ea42f587b344ee6865', 'ja4 t13d1516h2_8daaf6152771', 'ua Mozilla/5.0 zgrab/0.x', 'ua python-requests/2.31', 'ja4 t13d190900_9dc949149365'], 410),
    paths: countBy(EVENTS.filter((e) => e.type === 'http.request').map((e) => e.summary.replace(/^GET /, ''))),
    osDistribution: seededRows(0x818, ['Linux 2.2.x–3.x', 'Linux 3.11+', 'Windows NT', 'FreeBSD', 'embedded / IoT', 'unknown'], 700),
    tcpClusters: seededRows(0x929, ['64240_2-4-8-1-3_1460_7 (Linux)', '65535_2-1-3-1-1-4_1460_8 (Windows)', '29200_2-4-8-1-3_1460_7 (Mirai-like)', '5840_2-4-8-1-3_1460_5', '1024_2 (masscan)'], 600),
    icsFunctions: seededRows(0xa3a, ['Modbus 3 Read Holding Registers', 'Modbus 43 Read Device ID', 'S7 Read SZL', 'Modbus 6 Write Single Register', 'DNP3 1 Read', 'BACnet ReadProperty'], 180),
    decoyRequests: seededRows(0xb4b, ['GET /', 'GET /.env', 'GET /wp-login.php', 'POST /api/login', 'GET /.git/config', 'GET /actuator/health'], 260),
    decoyClients: seededRows(0xc5c, ['t13d1516h2_8daaf6152771 (Chrome-like)', 't13d190900_9dc949149365 (Go)', 't13i181000_85036bcba153 (curl)', 't12d330700_9a4a5d2a7e43 (python)'], 190),
    ja4h: seededRows(0xd6d, ['ge11nn050000_4740ae6347b0 (Go http)', 'ge11nn07enus_974ebe531c03 (browser)', 'po11nn060000_8f4a2c1e9b77 (python)', 'ge10nn030000_3a1f0e4b6c2d (curl)'], 330),
    ja4l: seededRows(0xe7e, ['2412_128 (≈ same region)', '9820_64 (EU ↔ Asia)', '15400_52 (trans-Pacific)', '480_255 (same host)'], 150),
    ja4x: seededRows(0xf8f, ['a373a9f83c6b_2bab15409345_7bf9a7bf7029 (self-signed)', '96a6439c8f5c_96a6439c8f5c_795797892f9c (Let’s Encrypt)', 'b5d3f1a07e21_2bab15409345_0c5e3f1f9e72'], 90),
    tls: seededRows(0x1a1a, ['t13d1516h2 (Chrome)', 't13d190900 (Go crypto/tls)', 't12d330700 (python ssl)', 't13i181000 (curl)', 't10d070600 (zgrab2)'], 280),
    ssh: seededRows(0x2b2b, ['Go x/crypto/ssh', 'libssh 0.9.x', 'paramiko 3.x', 'OpenSSH 8.x', 'PuTTY 0.7x', 'AsyncSSH'], 470),
    endlessh: rows([['< 10 s', 910], ['10 s – 1 min', 420], ['1 – 10 min', 180], ['10 min – 1 h', 64], ['1 – 6 h', 17], ['> 6 h', int(createRng(7), 2, 6)]]),
    alerts: countBy(EVENTS.filter((e) => e.type === 'ids.alert').map((e) => e.summary)),
    alertCategories: seededRows(0x3c3c, ['Attempted Information Leak', 'Misc Attack', 'Attempted Administrator Privilege Gain', 'Potentially Bad Traffic', 'Detection of a Network Scan'], 140),
    payloads: PAYLOADS.slice(0, 15),
    campaigns: NETWORK_CAMPAIGNS.slice(0, 15),
  }
}

export const OVERVIEW_VIEWS: OverviewViews = buildViews()
