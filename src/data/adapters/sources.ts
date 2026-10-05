// Wire → page mapping for the sources & correlation slice. Pure functions
// over the shapes in ../contracts/sources; nothing here fetches.
import type {
  AttackerEntity,
  BlockRecord,
  ClusterKind,
  CountRow,
  CredEdge,
  HoneypotEvent,
  IdentityFusion,
  InfraCluster,
  IpProfile,
  KillChainData,
  MapPoint,
  NetworkCampaign,
  SourceProfile,
  SourceGroup,
  Technique,
} from '../types'
import type {
  AttackerGraphWire,
  AttackerPageWire,
  AttckGridWire,
  CampaignTimelineWire,
  FusionWire,
  SankeyWire,
  CampaignPageWire,
  ClusterPageWire,
  CorrelationWire,
  CredEdgeWire,
  IpBlockWire,
  IpProfileWire,
  KvWire,
  MapPointsWire,
  SetIpBlockBody,
  SourcesPageWire,
  TechniqueWire,
} from '../contracts/sources'

// ---- shared rows ------------------------------------------------------------

/** An aggregation bucket. The page's CountRow carries an explicit `id` the
 * wire has no field for; the key is both, as every other adapter in this
 * tree does. */
const counts = (rows: KvWire[]): CountRow[] => rows.map((row) => ({ id: row.key, label: row.key, count: row.count }))

const techniques = (rows: TechniqueWire[]): Technique[] => rows.map((row) => ({ id: row.id, name: row.name, tactic: row.domain, events: row.count }))

const scanOf = (scan: string): 'horizontal' | 'vertical' | undefined => (scan === 'horizontal' || scan === 'vertical' ? scan : undefined)

// ---- GET /api/v1/sources ----------------------------------------------------

/** GET /api/v1/sources — one row per address. The page's `SourceProfile`
 * wants an `org`; this wire row has no organization field at all (a terms
 * aggregation over `source.ip` never asks for one), so it reads as "".
 * `truncated` and `total_unique` have no page field. */
export const sourceProfiles = (wire: SourcesPageWire): SourceProfile[] =>
  wire.rows.map((row) => ({
    ip: row.ip,
    country: row.country,
    org: '',
    events: row.events,
    logins: row.logins,
    sessions: row.sessions,
    sensors: row.sensors,
    first: row.first,
    last: row.last,
  }))

/** GET /api/v1/overview/dashboard?parts=map_points. The page's MapPoint has
 * no `city` and no `url`; `ips` is optional on the page and always a count
 * on the wire, so it is always carried across. */
export const mapPoints = (wire: MapPointsWire): MapPoint[] =>
  wire.map_points.map((point) => ({ country: point.country, lat: point.lat, lon: point.lon, events: point.events, ips: point.ips }))

// ---- GET /api/v1/attackers --------------------------------------------------

/** GET /api/v1/attackers — the entity documents, page-shaped.
 * `protocols_touched` has no page field. */
export const attackers = (wire: AttackerPageWire): AttackerEntity[] =>
  wire.rows.map((row) => {
    const entity: AttackerEntity = {
      id: row.id,
      ips: row.ips,
      fingerprints: row.fingerprints,
      payloads: row.payloads,
      credentials: row.credentials,
      sensors: row.sensors,
      events: row.events,
      first: row.first,
      last: row.last,
      updated: row.updated,
      verdicts: row.verdicts,
      techniques: row.techniques,
      destIps: row.dest_ips,
      portsTouched: row.ports_touched,
    }
    const scan = scanOf(row.scan)
    return scan ? { ...entity, scan } : entity
  })

/** GET /api/v1/attackers-graph?id= — the Cytoscape shape, unchanged. No
 * page type consumes it: `AttackerGraph.tsx` lays the star out from
 * `AttackerEntity.ips` itself, the same pass `ghidraCallGraph` documents. */
export const attackerGraph = (wire: AttackerGraphWire): AttackerGraphWire => ({ nodes: wire.nodes, edges: wire.edges })

// ---- GET /api/v1/campaigns and /cred-reuse ----------------------------------

/** GET /api/v1/campaigns. Three fields the page has and the wire does not:
 * `asns` (a campaigns-v1 document carries `providers`, never ASNs), `scan`
 * when the correlator found neither window, and `sequence` (the backend's
 * `explanation` is prose, not an ordered tactic list). Two numbers that
 * could be confused: the page's `portsTouched` is the size of `ports`,
 * where the wire's `ports_touched` is the *scored* count the correlator
 * blended into `score` — a different number under a similar name, so the
 * page's own value is used and the wire's is dropped. */
export const networkCampaigns = (wire: CampaignPageWire): NetworkCampaign[] =>
  wire.rows.map((row) => {
    const campaign: NetworkCampaign = {
      cidr: row.cidr,
      score: row.score,
      events: row.events,
      uniqueIps: row.unique_ips,
      sensors: row.sensors,
      ports: row.ports.map(Number).filter(Number.isFinite),
      creds: row.creds,
      payloads: row.payloads,
      alerts: row.alerts,
      providers: row.providers,
      asns: [],
      fingerprints: row.fingerprints,
      explanation: row.explanation,
      sequence: [],
      dstIpsTouched: row.dst_ips_touched,
      portsTouched: row.ports.length,
      first: row.first,
      last: row.last,
    }
    const scan = scanOf(row.scan)
    return scan ? { ...campaign, scan } : campaign
  })

/** GET /api/v1/cred-reuse — a bare array, most-shared first.
 * `CredEdge.id` is the `user:pass` pair: the wire splits the two halves and
 * never serves a document id, so it is rejoined. The page holds no address
 * list, so `ips` is dropped, and with it `first` — the page type carries
 * `last` only. */
export const credReuse = (wire: CredEdgeWire[]): CredEdge[] =>
  wire.map((edge) => ({
    id: `${edge.user}:${edge.pass}`,
    user: edge.user,
    pass: edge.pass,
    uniqueIps: edge.unique_ips,
    sensors: edge.sensors,
    events: edge.events,
    last: edge.last,
  }))

// ---- GET /api/v1/clusters ---------------------------------------------------

const clusterKind = (kind: string): ClusterKind => (kind === 'fingerprint' || kind === 'payload' || kind === 'asn' || kind === 'provider' ? kind : 'fingerprint')

/** GET /api/v1/clusters. The wire's four kinds are the page's four; the
 * page's fifth, `credential`, has no cluster document (a gap — widening
 * the union to match a backend that never writes one would be fiction). An
 * unknown wire kind degrades to `fingerprint` rather than widening
 * ClusterKind. `id` is the store's `kind:value` document id. */
export const infraClusters = (wire: ClusterPageWire): InfraCluster[] =>
  wire.rows.map((row) => ({ id: `${row.kind}:${row.value}`, kind: clusterKind(row.kind), value: row.value, sources: row.sources, events: row.events, sensors: row.sensors }))

// ---- GET /api/v1/ip-block ----------------------------------------------------

/** GET /api/v1/ip-block/{ip} — the page's BlockRecord. A record the backend
 * reports as lapsed (`Blocked` true, `Active` false) has no BlockRecord at
 * all: the page carries `block` only while the block holds, so a lapsed
 * one reads as blocked-but-unattributed. */
export function ipBlockRecord(wire: IpBlockWire): BlockRecord | null {
  if (!wire.Active) return null
  return { by: wire.BlockedBy ?? '', at: wire.BlockedAt ?? '', ...(wire.ExpiresAt ? { expiresAt: wire.ExpiresAt } : {}) }
}

/** POST /api/v1/ip-block body. The page's setter is `setIpBlocked(ip,
 * blocked)` and carries no duration or actor, so both are absent: the
 * backend then stores a permanent block (`ExpiresAt` null) attributed to
 * whoever the server fn puts in `actor`. This is the slice's one page-is-a-
 * subset save — nothing on the page expresses an expiry or a reason, so
 * neither can be sent. */
export const setIpBlockBody = (ip: string, blocked: boolean): SetIpBlockBody => ({ ip, blocked })

// ---- GET /api/v1/investigate/{ip,cidr,cluster} ------------------------------

/** The one `Correlation` → the SourceGroup fields all three drill-downs
 * share. `truncated` and `sensors` have no field there. */
export const correlation = (wire: CorrelationWire) => ({ totalMatches: wire.total, tunnelConnections: wire.tunnel_connections, tunnelOsGuesses: wire.tunnel_os_guesses })

/** The same struct → the page IpProfile's `correlation` block. The page
 * counts distinct sensors itself, so `sensors.length` stands in — but that
 * list is capped at 10 by the backend, so on a wider spread this
 * undercounts. Noted rather than hidden; the field is informational. */
export const ipCorrelation = (wire: CorrelationWire) => ({ totalMatches: wire.total, tunnelConnections: wire.tunnel_connections, distinctSensors: wire.sensors.length, tunnelOsGuesses: wire.tunnel_os_guesses })

/** GET /api/v1/investigate/ip/{ip}. The page's `source` wants an `org`, a
 * `riskScore` and `tags`; the wire's `asn` is an organization name
 * (aggregated off `source.as.organization_name`, not the ASN number) and
 * there is no score, so 0 and []. `blocked`/`block` come from the ip-block
 * endpoint and `attackerId` from the attackers store — neither is
 * something this endpoint can answer, so both are left to the caller. */
export const ipProfile = (wire: IpProfileWire): IpProfile => ({
  source: {
    ip: wire.ip,
    country: wire.country,
    org: wire.asn,
    events: wire.total,
    logins: 0,
    sessions: wire.sessions.reduce((sum, row) => sum + row.count, 0),
    sensors: wire.sensors.map((row) => row.key),
    first: wire.first,
    last: wire.last,
    asn: wire.asn,
    riskScore: 0,
    tags: [],
  },
  blocked: false,
  confirmedMalicious: wire.confirmed_malicious,
  events: [],
  sensors: counts(wire.sensors),
  credentials: counts(wire.credentials),
  commands: counts(wire.commands),
  paths: counts(wire.paths),
  ports: counts(wire.ports),
  protocols: counts(wire.protos),
  sessions: counts(wire.sessions),
  payloads: counts(wire.payloads),
  alerts: counts(wire.alerts),
  techniques: techniques(wire.techniques),
  correlation: ipCorrelation(wire.correlation),
})
// ---- GET /api/v1/charts/{attck-coverage,kill-chain-sankey,campaign-timeline}

/** GET /api/v1/charts/attck-coverage. The wire's `techniques` entries are
 * `"T1059.004 Unix Shell"` — id and name joined by one space — so they are
 * split back apart here rather than the page rendering the joined string as
 * a name. A cell is positional (`tactic_idx` / `technique_idx`), and a cell
 * pointing outside either list is dropped rather than rendered as `undefined`. */
export const attackCoverage = (wire: AttckGridWire): Pick<KillChainData, 'tactics' | 'coverage'> => {
  const ids = wire.techniques.map((entry) => entry.split(' ')[0])
  return {
    tactics: wire.tactics,
    coverage: wire.cells.flatMap((cell) => {
      const id = ids[cell.technique_idx]
      const tactic = wire.tactics[cell.tactic_idx]
      return id && tactic ? [{ tactic, technique: id, name: wire.techniques[cell.technique_idx].slice(id.length + 1), events: cell.count }] : []
    }),
  }
}

/** GET /api/v1/charts/kill-chain-sankey. The links name their tactics; the
 * page's Sankey indexes into `nodes`, so the names are resolved here. A
 * link naming a node the list does not hold is dropped, not drawn to 0. */
export const killChainFlow = (wire: SankeyWire) => {
  const index = new Map(wire.nodes.map((node, i) => [node.name, i]))
  return {
    nodes: wire.nodes.map((node) => ({ name: node.name })),
    links: wire.links.flatMap((link) => {
      const source = index.get(link.source)
      const target = index.get(link.target)
      return source === undefined || target === undefined ? [] : [{ source, target, value: link.value }]
    }),
  }
}

/** GET /api/v1/charts/campaign-timeline. Epoch millis in, ISO strings out —
 * the page's timeline parses with `Date.parse`, so the conversion happens
 * once here rather than in the chart. */
export const campaignTimeline = (wire: CampaignTimelineWire[]): KillChainData['timeline'] => wire.map((row) => ({ cidr: row.cidr, first: new Date(row.start_ms).toISOString(), last: new Date(row.end_ms).toISOString(), events: row.events }))

/** GET /api/v1/charts/attacker-fusion. The three page fields are the wire's
 * three arrays; the category a sensor does not produce is a zero column
 * upstream, so nothing is dropped here either. */
export const identityFusion = (wire: FusionWire): IdentityFusion => ({ categories: wire.categories, values: wire.values, ips: wire.ips })

// ---- the entity pages' SourceGroup ---------------------------------------

/** The page `SourceGroup`, built from one correlation's records — the same
 * records the entity pages' event tab renders, folded by their own list
 * definitions. The rows arrive already mapped through the seam's
 * `pageEvent`, so the fold reads the page's own field names.
 *
 * What the group wants that `Correlation` cannot supply, and what is done
 * about it rather than invented:
 *
 * - `members` — `Correlation` carries no address list, only rows, so the
 *   members are the distinct `src_ip` of those rows. The records are capped
 *   at 200 across honeypot and portbridge (`CORRELATION_LIMIT`), so on a
 *   wider block this is the addresses the records show, not every address
 *   in it; the header counts `members.length`, which is then a floor.
 * - `org` — never: nothing upstream carries an organization per address, so
 *   every member reads "". The same gap as `SourceProfile.org` above.
 * - `logins` — 0: no row upstream classifies a login, so no member claims
 *   one. The same gap the ip profile fills from `sessions` instead.
 * - `networks` — the /24 of each member, which is the grouping the page's
 *   "Networks" table shows and the finest one derivable from an address.
 * - `sensors` — the correlation's own sensor buckets, capped at 10
 *   upstream, which is why this is the buckets and not a recount. */
export const correlationGroup = (wire: CorrelationWire, events: HoneypotEvent[]): SourceGroup => {
  const byIp = new Map<string, HoneypotEvent[]>()
  for (const row of events) if (row.srcIp) byIp.set(row.srcIp, [...(byIp.get(row.srcIp) ?? []), row])
  const times = events.map((row) => row.timestamp).sort()
  const tally = (values: string[]): CountRow[] => {
    const buckets = new Map<string, number>()
    for (const value of values) buckets.set(value, (buckets.get(value) ?? 0) + 1)
    return [...buckets].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([label, count]) => ({ id: label, label, count }))
  }
  const members: SourceProfile[] = [...byIp].map(([ip, rows]) => ({
    ip,
    country: rows.find((row) => row.country)?.country ?? '',
    org: '',
    events: rows.length,
    logins: 0,
    sessions: new Set(rows.map((row) => row.sessionId).filter(Boolean)).size,
    sensors: [...new Set(rows.map((row) => row.sensor).filter(Boolean))],
    first: rows.map((row) => row.timestamp).sort()[0],
    last: rows.map((row) => row.timestamp).sort().at(-1) ?? '',
  }))
  return {
    members,
    events,
    totalMatches: wire.total,
    tunnelConnections: wire.tunnel_connections,
    tunnelOsGuesses: wire.tunnel_os_guesses,
    ...(times[0] ? { first: times[0] } : {}),
    ...(times.length ? { last: times.at(-1)! } : {}),
    sensors: wire.sensors.map((row) => ({ id: row.key, label: row.key, count: row.count })),
    countries: tally(events.map((row) => row.country)),
    networks: tally(members.map((member) => `${member.ip.split('.').slice(0, 3).join('.')}.0/24`)),
    ports: tally(events.map((row) => String(row.dstPort))),
    // The page event carries each pivot already lifted off the wire row:
    // `pivots.user` is the event's `username`, `pivots.command` its
    // `command`, and `pivots.shasum` has no page field at all — so the
    // payload table reads the sensor's own `honeypot.shasum` from `fields`,
    // which is where the row keeps it.
    credentials: tally(events.map((row) => row.username ?? '')),
    commands: tally(events.map((row) => row.command ?? '')),
    payloads: tally(events.map((row) => String(row.fields.shasum ?? ''))),
  }
}
