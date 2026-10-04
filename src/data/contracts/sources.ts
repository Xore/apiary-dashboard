// The source, campaign, cluster and correlation payloads the Rust tier
// serves (backend-service stores.rs, aggregates.rs, correlations.rs,
// correlator.rs, attacker_identity.rs, investigate.rs, detail.rs,
// ip_block.rs, dashboard.rs, events.rs), as they arrive on the wire.
//
// The three store lists (`/attackers`, `/campaigns`, `/clusters`) are NOT
// uniform: each reads a different ES index whose documents a different
// writer built, and `store_page` hands back raw `_source` plus `_doc_id`.
// So their row types below are the writers' fields, not one shared row.
//
// `/investigate/ip/{ip}`, `/investigate/cidr/{cidr}` and
// `/investigate/cluster` do share: all three wrap the same
// `investigate::Correlation` struct, differing only in their own envelope.

// ---- GET /api/v1/attackers?offset&size ---------------------------------------

/** One attackers-v1 `_source` (attacker_identity.rs `Entity`), exactly as
 * `serde_json::to_value` writes it. `window_events`, `verdicts_pending`,
 * `evidence`, `sensor_counts`, `protocols_touched` and `ports_touched` carry
 * `skip_serializing_if`, so a doc written before its first touched cycle
 * omits them. `scan` is "" when neither scan window applied.
 * `EvidencePointerWire` is `{id, ts}` with `ts` in millis since epoch. */
export interface AttackerEntityWire {
  id: string
  ips: string[]
  fingerprints: string[]
  payloads: string[]
  credentials: string[]
  sensors: string[]
  events: number
  first: string
  last: string
  updated: string
  verdicts: string[]
  techniques: string[]
  ports_touched: number
  dest_ips: number
  protocols_touched: number
  scan: string
  window_events?: number
  verdicts_pending?: boolean
  evidence?: Array<{ id: string; ts?: number }>
  sensor_counts?: Record<string, number>
}

/** GET /api/v1/attackers?offset&size — the paged store page. `_doc_id` is
 * the entity id, repeated from `_source.id`. */
export interface AttackerPageWire {
  total: number
  rows: Array<AttackerEntityWire & { _doc_id: string }>
}

// ---- GET /api/v1/sources?offset&size ----------------------------------------

/** One row of GET /api/v1/sources (aggregates.rs `SourceRow`). This is the
 * only row in the slice the backend builds itself: a terms aggregation over
 * `source.ip` with per-bucket sub-aggregations, not a stored document. */
export interface SourceRowWire {
  ip: string
  country: string
  events: number
  logins: number
  sessions: number
  sensors: string[]
  first: string
  last: string
}

/** GET /api/v1/sources?offset&size. `total_unique` counts the whole 10-day
 * window while `rows` is the requested slice; `truncated` is true when the
 * terms aggregation hit its 1000-bucket ceiling, so `total_unique` counts
 * addresses no row shows. */
export interface SourcesPageWire {
  total_unique: number
  truncated: boolean
  rows: SourceRowWire[]
}

// ---- GET /api/v1/campaigns?offset&size --------------------------------------

/** One campaigns-v1 `_source` (correlator.rs `score_campaigns`'s `doc`),
 * written as a serde-free `json!` literal and paged raw. The correlator
 * writes every key below unconditionally. Note `ports_touched` on the wire
 * is the *count* the correlator scored (`ports_touched_counted` in the
 * document), and the page's `portsTouched` is a different number — the size
 * of `ports`. `asns` is not a writer field: no campaigns-v1 document
 * carries it. */
export interface CampaignWire {
  cidr: string
  score: number
  events: number
  unique_ips: number
  dst_ips_touched: number
  ports_touched_counted: number
  protocols_touched: number
  scan: string
  sensors: string[]
  ports: string[]
  creds: number
  payloads: number
  alerts: number
  providers: string[]
  fingerprints: number
  first: string
  last: string
  generated: string
  explanation: string
}

export interface CampaignPageWire {
  total: number
  rows: Array<CampaignWire & { _doc_id: string }>
}

// ---- GET /api/v1/clusters?offset&size ---------------------------------------

/** One attacker-clusters-v1 `_source` (correlator.rs `finalize_clusters`).
 * Every field is written unconditionally; `sources` is the cluster's
 * distinct-address count, and `kind` is one of the four the correlator
 * buckets on — fingerprint, payload, asn, provider. There is no
 * `credential` kind: the page type has one, no cluster document does. */
export interface ClusterWire {
  kind: string
  value: string
  events: number
  sources: number
  sensors: string[]
  generated: string
}

export interface ClusterPageWire {
  total: number
  rows: Array<ClusterWire & { _doc_id: string }>
}

// ---- GET /api/v1/cred-reuse -------------------------------------------------

/** One entry of GET /api/v1/cred-reuse (correlations.rs `CredEdge`). The
 * response is a bare array — the one non-paged read in the store family.
 * `ips` is capped at CRED_IPS_LISTED, `sensors` at 6, and `size` is 200. */
export interface CredEdgeWire {
  user: string
  pass: string
  unique_ips: number
  ips: string[]
  sensors: string[]
  events: number
  first: string
  last: string
}

// ---- GET /api/v1/attackers-graph?id= ----------------------------------------

/** One node. kind is "hub" (the one `hub:{id}` node), "spoke" (one member
 * address) or "overflow" (the single `overflow:{id}` node the graph
 * adds past GRAPH_MAX_NODES, labelled `+N`). */
export interface AttackerGraphNodeWire {
  id: string
  label: string
  kind: string
}

/** One edge. Always hub-to-spoke: the graph is a star, so `source` is
 * always the `hub:` node's id. */
export interface AttackerGraphEdgeWire {
  source: string
  target: string
}

/** GET /api/v1/attackers-graph?id= — nodes AND edges, not edges-only (the
 * same shape `ghidra-callgraph` uses). */
export interface AttackerGraphWire {
  nodes: AttackerGraphNodeWire[]
  edges: AttackerGraphEdgeWire[]
}

// ---- GET /api/v1/overview/dashboard?parts=map_points ------------------------

/** One pin of the `map_points` slice (dashboard.rs `MapPoint`). `url` is the
 * marker drill-down the backend builds; `ips` is the distinct-address count
 * in that city. Slicing is by omission, not by a nested envelope: the
 * handler serves one `Dashboard` struct, and `?parts=map_points` strips
 * every aggregation the response would carry except the points, so the
 * response body has `map_points` and nothing else the page can use. */
export interface MapPointWire {
  city: string
  country: string
  lat: number
  lon: number
  events: number
  ips: number
  url: string
}

/** GET /api/v1/overview/dashboard?parts=map_points. Every sibling key of
 * `map_points` is present but empty on this slice — that is what
 * `Dashboard`'s non-`Option` fields serialize to when their aggregation was
 * stripped, so they are typed here as the empty forms the page ignores. */
export interface MapPointsWire {
  protocols: unknown[]
  top_ports: unknown[]
  countries: unknown[]
  asns: unknown[]
  providers: unknown[]
  top_ips: unknown[]
  top_paths: unknown[]
  top_creds: unknown[]
  top_commands: unknown[]
  clients: unknown[]
  fingerprints: unknown[]
  alerts: unknown[]
  alert_cats: unknown[]
  payloads: unknown[]
  heatmap: unknown[]
  sensors: unknown[]
  map_points: MapPointWire[]
  logins: number
}

// ---- GET /api/v1/investigate/ip/{ip} ----------------------------------------

/** An aggregation bucket: the `{key, count}` pair behind every CountRow on
 * the page (investigate.rs `Kv`). `key` is a string for every field on this
 * endpoint, including the numeric ones — `kv()` stringifies ints. */
export interface KvWire {
  key: string
  count: number
}

/** session.rs `Technique`. `domain` is the ATT&CK tactic; `evidence` is the
 * backend's own one-line justification; `url` is the mitre.org link. */
export interface TechniqueWire {
  id: string
  name: string
  domain: string
  evidence: string
  count: number
  url: string
}

/** events.rs `EventPivots`: the detail pane's link groups, extracted
 * server-side so the frontend never re-derives per-sensor field naming.
 * Every field is a string; "" means absent and the pane skips it. `pass` is
 * scrubbed for the http/cisco decoys (#3213), and `ics_severity` is
 * "critical"/"high"/"" only for DNP3. */
export interface EventPivotsWire {
  persona: string
  site: string
  asset: string
  fingerprint: string
  fingerprint_kind: string
  command: string
  user: string
  pass: string
  path: string
  shasum: string
  asn: string
  org: string
  provider: string
  alert: string
  category: string
  payload_class: string
  tty_replay: string
  ics_severity: string
}

/** events.rs `EventRow`, as the correlation passes emit it. `id` is empty on
 * every row these three endpoints serve — they build rows from a bare
 * `_source`, so there is no hit to take a document id from (only
 * `/events` uses `row_from_hit`). `port` is a string on the wire even when
 * the port is numeric. `record` is the complete normalized ECS document,
 * with credentials redacted for the two decoy sensors. */
export interface EventRowWire {
  src_ip_claimed: string
  id: string
  time: string
  sensor: string
  src_ip: string
  country: string
  port: string
  proto: string
  detail: string
  session: string
  pivots: EventPivotsWire
  record: Record<string, unknown>
}

/** The shared body of the three investigate drill-downs
 * (investigate.rs `Correlation`), built by the one `build_correlation` all
 * three call. `records` is capped at CORRELATION_LIMIT (200) across the
 * honeypot/Suricata and portbridge hits together, newest first; `truncated`
 * says so when `total` outruns it. `sensors` is capped at 10 and carries a
 * synthetic `portbridge` entry when the tunnel pass had any hits. */
export interface CorrelationWire {
  total: number
  truncated: boolean
  sensors: KvWire[]
  tunnel_connections: number
  tunnel_os_guesses: string[]
  records: EventRowWire[]
}

/** investigate.rs `PortbridgeProfile`: the second, separate p0f/portbridge
 * pass over the same address. Absent (null) when that family had no hits. */
export interface PortbridgeProfileWire {
  os: string
  first: string
  last: string
  ports_touched: KvWire[]
}

/** GET /api/v1/investigate/ip/{ip}. 404 when the address has no events in
 * the 10-day window — there is no empty profile. */
export interface IpProfileWire {
  ip: string
  total: number
  first: string
  last: string
  country: string
  asn: string
  sensors: KvWire[]
  ports: KvWire[]
  protos: KvWire[]
  credentials: KvWire[]
  commands: KvWire[]
  sessions: KvWire[]
  techniques: TechniqueWire[]
  payloads: KvWire[]
  alerts: KvWire[]
  fingerprints: KvWire[]
  paths: KvWire[]
  events: EventRowWire[]
  portbridge: PortbridgeProfileWire | null
  correlation: CorrelationWire
  confirmed_malicious: boolean
}

/** GET /api/v1/investigate/cidr/{cidr} — the same `Correlation`, wrapped in
 * the block that was correlated. */
export interface CidrCorrelationWire {
  cidr: string
  correlation: CorrelationWire
}

/** GET /api/v1/investigate/cluster?kind=&value= — the same `Correlation`
 * again, wrapped in the cluster and the address count it resolved to. 404
 * when fewer than two member addresses share the cluster, or when `kind` is
 * not one of the four the membership filter knows. */
export interface ClusterCorrelationWire {
  kind: string
  value: string
  ip_count: number
  correlation: CorrelationWire
}

// ---- GET /api/v1/ip-block/{ip} ----------------------------------------------

/** A dashboard-ip-block-v1 record as GET serves it. A never-blocked address
 * has no document, and the handler synthesizes `{IP, Blocked:false}` — so
 * `BlockedBy`/`BlockedAt` are absent and `ExpiresAt` is absent rather than
 * null. `Active` is computed fresh on read (expiry is evaluated against the
 * clock, not stored), so it is false on a lapsed record that still says
 * `Blocked: true`. */
export interface IpBlockWire {
  IP: string
  Blocked: boolean
  Active: boolean
  BlockedBy?: string
  BlockedAt?: string
  ExpiresAt?: string | null
}

/** POST /api/v1/ip-block body (`BlockBody`). `expires_days` 0 (the default)
 * means no expiry — the handler sends ExpiresAt null, which is what the
 * index's date mapping needs; a positive value is days from now, computed
 * server-side, so the client never sends a timestamp. `actor` defaults to
 * "" server-side; the dashboard's server fn fills it from the session. */
export interface SetIpBlockBody {
  ip: string
  blocked: boolean
  expires_days?: number
  actor?: string
}

/** POST /api/v1/ip-block response — the record just written. No `Active`:
 * the write path does not compute it, and every key here is non-optional. */
export interface IpBlockWrittenWire {
  IP: string
  Blocked: boolean
  BlockedBy: string
  BlockedAt: string
  ExpiresAt: string | null
}