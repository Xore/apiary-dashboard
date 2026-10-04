// Wire shapes of the event explorer's remaining endpoints: the list's query
// string, the filter-bar vocabularies, one event, one session, the TTY
// recording store and its replay payload, and the omnibox search. Typed
// from the Rust handlers in backend-service: src/events.rs (EventsQuery),
// src/aggregates.rs (FilterValues), src/event_page.rs (EventPage), src/
// session.rs (SessionDetail), src/stores.rs (recordings), src/replay.rs
// (Replay) and src/search.rs (SearchResult). Snake_case as on the wire.
//
// The shared event row, its pivots, the events page envelope and the
// correlated-IP list are NOT here: they live in ./events, which every slice
// that lists events reuses (this one, the Monitor slice, the correlation
// drill-downs). The Kv and Technique structs below are re-exported from
// ./sources for the same reason — session.rs and investigate.rs build both
// from one `technique_row`, so one set of wire types serves both.

import type { EventRow, EventsPage } from './events'
import type { KvWire, TechniqueWire } from './sources'

export type { KvWire, TechniqueWire }

// ---- GET /api/v1/events?{params} --------------------------------------------

/** events.rs `EventsQuery`: every parameter the explorer accepts, with the
 * handler's own defaults. `offset` defaults to 0 and `size` to 25; the
 * handler then clamps `size` to 100 and `offset` to `10_000 - size` (the ES
 * from+size window guard), so the `offset` the response reports can differ
 * from the one asked for — always page with the returned value.
 *
 * `since` is a Go-style duration relative to now, accepted only when it is
 * non-empty, at most 8 characters and entirely ASCII alphanumeric
 * (`since_to_range`). Anything else — `1h30m`, `90 d`, `7days` — is
 * SILENTLY ignored and the window falls back to `now-10d`; the response
 * never says which window it applied. `365d` and `90d` are both 3 and 2
 * characters, so the history and recording-attribution windows are inside
 * the accepted shape.
 *
 * Every other parameter is a single-value `term` EXCEPT the four that are
 * built with `any_of`: `ips` (comma-separated addresses), `cred` (a
 * `"user / pass"` pair split on that exact separator), `fingerprint`
 * (canonical_fingerprint / hassh / fingerprint / client / user_agent) and
 * `cmd` (canonical_command / command / input), `path` (path / url) and
 * `session` (honeypot.session / honeypot.session_id / session.id). `cred`
 * with no " / " filters the account half alone and emits no password clause.
 *
 * `kind` is an exact `term` on `honeypot.event`, NOT a prefix and not a
 * wildcard, and NOT comma-splittable: `kind=command` returns exactly the
 * documents whose normalized `honeypot.event` is the literal string
 * "command", and `kind=cowrie.log.closed` the literal close-event id. A
 * value no sensor writes returns an empty page, not an error.
 *
 * A parameter the struct does not declare is silently ignored (there is no
 * `deny_unknown_fields`), so a misspelled filter narrows nothing and looks
 * like a filter that matched everything. `offset` and `size` are u64, so a
 * negative or non-numeric value is a 400 rejection rather than a default. */
export interface EventsQueryWire {
  offset?: number
  size?: number
  ip?: string
  /** Comma-separated; the only multi-address parameter. */
  ips?: string
  sensor?: string
  country?: string
  city?: string
  port?: string
  proto?: string
  kind?: string
  shasum?: string
  /** `network.community_id`: one flow across every sensor that saw it. */
  community_id?: string
  /** Passed to Elasticsearch `query_string` as-is, `lenient: true` — a
   * malformed query matches nothing rather than failing. */
  q?: string
  since?: string
  persona?: string
  site?: string
  asset?: string
  fingerprint?: string
  /** Exact command text (the query param is `cmd`, not `command`). */
  cmd?: string
  cred?: string
  path?: string
  session?: string
  asn?: string
  org?: string
  provider?: string
  /** IDS alert signature (`sig`, not `signature`). */
  sig?: string
  /** Detection category (`cat`, not `category`). */
  cat?: string
}

/** GET /api/v1/events — the page envelope, re-exported from ./events so a
 * caller importing this module gets the whole list contract. */
export type { EventsPage, EventRow }

// ---- GET /api/v1/filter-values ----------------------------------------------

/** aggregates.rs `FilterValues`: one terms aggregation per filter dropdown
 * over the last 48 hours, fleet-probe documents excluded. NOT paged and
 * NOT counted — the handler returns the bucket keys only, so a value with
 * more occurrences than a bucket's `size` is simply absent rather than
 * ranked lower. The per-group ceilings are the backend's, not the wire's:
 * sensors 60, countries 200, cities 500, protos 60, ports 60, kinds 40.
 * Countries and cities are sorted server-side; the rest come back in
 * document-count order. `ports` elements are strings because a keyword-
 * mapped port aggregates as either text or a number — `keys` takes
 * `as_str` first and falls back to `as_i64`. */
export interface FilterValuesWire {
  sensors: string[]
  countries: string[]
  cities: string[]
  protos: string[]
  ports: string[]
  kinds: string[]
}

// ---- GET /api/v1/event/{id} -------------------------------------------------

/** event_page.rs `RelatedEvent`: one sampled neighbour in a relation. Four
 * fields, not a full row — the relation's rows are counts and samples for a
 * link-out, not event pages. */
export interface RelatedEventWire {
  time: string
  sensor: string
  src_ip: string
  detail: string
}

/** event_page.rs `Relation`: an honest total plus the newest 25 rows that
 * match. `key` is the value the relation was run on (the session id, the
 * community id or the source address) and is "" — with `total` 0 and no
 * rows — when the event carries no such value, or when the search failed. */
export interface RelationWire {
  key: string
  total: number
  rows: RelatedEventWire[]
}

/** GET /api/v1/event/{id} — event_page.rs `EventPage`. Deliberately richer
 * than the list row in its RELATIONS and deliberately poorer in its own
 * body: it carries no `pivots`, no `port`, no `proto` and no per-sensor
 * `detail`, because it is built by reading the document directly rather
 * than by `events::row_from_hit`. The page's `event` therefore cannot come
 * from here — see adapters/explorer.ts `eventDetail`, which takes the row
 * from the list endpoint.
 *
 * `record` is the document exactly as indexed, scrubbed for the two decoy
 * sensors. `index` is the ES index the document came from, which the list
 * does not carry. `hashes` is every 32/40/64/128-hex string anywhere in the
 * document, found by shape rather than by field name. `flow_link` is the
 * materialized `flow-links-v1` cross-family summary, null unless the
 * correlator has seen this flow from at least two sensor families — a
 * normal answer, not an error. 404 when no document carries the id. */
export interface EventPageWire {
  id: string
  index: string
  time: string
  sensor: string
  src_ip: string
  session: string
  community_id: string
  hashes: string[]
  record: Record<string, unknown>
  session_events: RelationWire
  flow_events: RelationWire
  source_events: RelationWire
  /** `correlations.rs`'s flow-link document, or null. Untyped here: the
   * shape is the correlator's materialization output, not a serde struct,
   * and no page type consumes it yet. */
  flow_link: Record<string, unknown> | null
}

// ---- GET /api/v1/sessions/{id} ----------------------------------------------

/** session.rs `Sequence`: one curated multi-step detection over a session's
 * command stream (Redis→SSH key injection, ADB device fingerprinting). Both
 * are fixed strings assembled by the handler, not a scored model output.
 * There are exactly two. */
export interface SequenceWire {
  name: string
  severity: string
  summary: string
}

/** GET /api/v1/sessions/{id} — session.rs `SessionDetail`, the bundle: the
 * header fields, four leaderboards, the ATT&CK table, the sequence
 * detections and every event of the session, chronological.
 *
 * The events are `hits`, capped at 1000 and sorted oldest first, so
 * `total` is the true match count and can exceed `events.length`. The
 * leaderboards are `Kv` pairs capped at 20 (sensors, credentials, payloads)
 * and 30 (commands). `ip` and `country` are read off the LAST event, not
 * the first — the shape answers for one attacker, and an attacker that
 * changed address mid-session is reported as its final one.
 *
 * There is no recording reference: the wire names no shasum. 400 for an
 * empty or over-256-character id, 404 when nothing matches. */
export interface SessionDetailWire {
  id: string
  ip: string
  country: string
  first: string
  last: string
  total: number
  sensors: KvWire[]
  commands: KvWire[]
  credentials: KvWire[]
  payloads: KvWire[]
  techniques: TechniqueWire[]
  sequences: SequenceWire[]
  events: EventRow[]
}

// ---- GET /api/v1/recordings --------------------------------------------------

/** One row of GET /api/v1/recordings (stores.rs `recordings`, assembled
 * with `json!`). The unit is the recorded SESSION, not the recording: one
 * row per `cowrie.log.closed` event, because the ttylog store is
 * content-addressed and 111,845 sessions collapse onto 171 recordings —
 * so many rows legitimately share a `shasum`.
 *
 * Every field is projected explicitly out of the close event
 * (`_source` is restricted to seven paths), so there is no `record` and no
 * `id`: the row has no document id of its own. `src_ip` is "" when
 * enrichment left the WireGuard tunnel address there — reported as no
 * attribution at all rather than as the fleet's own address. */
export interface RecordingWire {
  when: string
  src_ip: string
  country: string
  session: string
  shasum: string
  size_bytes: number
  duration_ms: number
}

/** GET /api/v1/recordings?offset&size[&ip] — the `{total, rows}` envelope,
 * `size` clamped to 100. Unlike the generic `store_page` this handler does
 * NOT add `_doc_id` (its rows are projections, not store documents), and it
 * sorts on `@timestamp` alone rather than on the store's own field. `ip`
 * narrows to one source address. `q` is accepted by the shared StoreQuery
 * but ignored here — the filter is a hard-coded close-event term, not the
 * query string. */
export interface RecordingsPageWire {
  total: number
  rows: RecordingWire[]
}

/** GET /api/v1/recordings/{shasum} — replay.rs `Replay`, JSON (the two
 * sibling routes `…/cast` and `…/raw` are the text and binary download
 * forms; this one is the one the pages read). The server decodes the
 * cowrie ttylog frame stream itself: `transcript` is the concatenation of
 * the OUTPUT-direction write frames as lossy UTF-8 with ANSI sequences kept,
 * `frames` counts every frame in the stream including input and non-write
 * ones, and `duration_seconds` is the span between the first and last frame
 * timestamp — 0 on a stream with fewer than two frames.
 * `ttylog_base64` is the original encoded artifact, for a browser-side
 * frame-indexed player. 404 when the shasum is not in the store. */
export interface ReplayWire {
  shasum: string
  size_bytes: number
  imported_at: string
  frames: number
  duration_seconds: number
  transcript: string
  ttylog_base64: string
}

// ---- GET /api/v1/search?q= ---------------------------------------------------

/** search.rs `Hit`: one distinct value inside a group, with how many
 * documents carry it and the app route that scopes to it. `url` is an
 * in-app path (`/events?cmd=…`, `/sessions/{id}`), already encoded. */
export interface SearchHitWire {
  label: string
  count: number
  url: string
}

/** search.rs `Group`: one aggregation bucket family. `more` is how many
 * further matches the 8-per-group cap left out, and `more_url` is the
 * scoped history console the overflow link points at — the one surface
 * guaranteed to show everything. A group with no hits is not emitted at
 * all, so `groups` never carries an empty bucket. */
export interface SearchGroupWire {
  title: string
  hits: SearchHitWire[]
  more: number
  more_url: string
}

/** GET /api/v1/search?q= — search.rs `SearchResult`. Grouped, not a flat
 * list: one pass of prefix filters (plus real substring wildcards on the
 * Suricata signature and `url.path` fields) over the last 48 hours.
 *
 * `redirect` is set when the query names exactly one session id or exactly
 * one literal IP — the omnibox's "Enter" jump — and is null otherwise.
 * `total` counts HITS, not matching documents: a value matching 4,000
 * documents contributes 1.
 *
 * There is no degraded or "unavailable" shape: an empty or over-256-
 * character query returns `{query, redirect: null, groups: [], total: 0}`
 * with 200, and a cluster failure is a 502, not an empty envelope. */
export interface SearchResultWire {
  query: string
  redirect: string | null
  groups: SearchGroupWire[]
  total: number
}

// ---- routes/events.tsx#fetchInvestigationConfig -----------------------------

/** The three "open in an external tool" bases the events explorer's row
 * menu links to.
 *
 * There is NO backend endpoint for this, and that is the finding, not an
 * omission: the canonical frontend builds it entirely from its own process
 * environment — `KIBANA_PUBLIC_URL` / `EVEBOX_PUBLIC_URL` /
 * `ARKIME_PUBLIC_URL`, each falling back to `https://{tool}.{HONEYPOT_DOMAIN}`
 * when the explicit variable is unset. Nothing is read from Elasticsearch,
 * the API or the BFF, because it is deployment configuration rather than
 * telemetry. Typed here so the page-side gap is recorded in one place; an
 * adapter would have to invent an endpoint to produce it. Each field is ""
 * when neither the explicit variable nor the domain is set — the same
 * "absent menu entry over a guess" posture the Go tier took. */
export interface InvestigationConfigWire {
  kibana: string
  evebox: string
  arkime: string
}