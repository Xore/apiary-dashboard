// The real backend behind the events & sessions slice (#75): the APIARY
// Rust tier (backend-service), fetched over the same shared service token
// this tier already presents on /metrics, and mapped with the adapters that
// shipped in #167. Server-only; the browser never loads it.
//
// The mock stays the default. `runForRequest` (src/data/backend.ts) routes
// here only when the page carries no `?mock=` AND this process has
// BACKEND_URL set; every mock scenario, and every query this module does
// not implement, still answers from the mock — which is what keeps the ten
// scenarios and the browser checks working.
//
// Base URL and token: the same two variables the canonical BFF reads
// (frontend-next/src/lib/backend.server.ts `backendURL()` and the
// `x-service-token` header), so one deployment configures both tiers.
// BACKEND_URL is also the opt-in: unset means "this tier talks to nobody",
// which is the default. The token is never logged, never in a URL, and
// never in an error message — it only ever rides as a request header.
import { ApiError } from './errors'
import {
  commandsQuery,
  eventDetail,
  eventsQuery,
  eventsQueryWindowed,
  filterValues,
  recordingRows,
  replayDetail,
  searchGroups,
  sessionDetail,
} from './adapters/explorer'
import { toHoneypotEvent } from './adapters/events'
import type { EventRowGap } from './adapters/events'
import { readingOf } from './mock/sensors'
import { authorize } from '#/server/authorize'
import type { ApiErrorKind } from './errors'
import type { EventPageWire, EventsQueryWire, FilterValuesWire, RecordingsPageWire, ReplayWire, SearchResultWire, SessionDetailWire } from './contracts/explorer'
import type { EventRow, EventsPage as EventsPageWire } from './contracts/events'
import type { Backend, Caller } from './backend'
import type { EventType, HoneypotEvent, Paged } from './types'

/** A dashboard that hangs forever is worse than one that errors. Same budget
 * as the canonical BFF's own backend calls (backend.server.ts). */
const TIMEOUT_MS = 15_000

/** This process has a real backend to talk to. Its absence is the default. */
export const isLiveBackend = (env: NodeJS.ProcessEnv = process.env): boolean => Boolean(env.BACKEND_URL?.trim())

/** One wire page's worth of nothing — the degraded answer a 200 with no body
 * maps to. Every real endpoint answers 200 with its envelope, so this is
 * only reachable through a fixture or a proxy that swapped the body. */
const EMPTY_PAGE = { total: 0, offset: 0, rows: [] }
const EMPTY_VALUES: FilterValuesWire = { sensors: [], countries: [], cities: [], protos: [], ports: [], kinds: [] }

// ---- the call ---------------------------------------------------------------

/** Which page state a refusal maps to.
 *
 * A 401 from THIS tier means the shared secret is wrong or missing — a
 * deployment misconfiguration, not an operator's session ending. It is
 * deliberately NOT `expired`: that state drives the sign-in flow, so mapping
 * a bad SERVICE_TOKEN onto it would send every operator to sign in again
 * for a fault only a deployment fix cures. There is no page state for "the
 * backend will not talk to us", so it is `unavailable` — 502, retryable —
 * with the tier's own words in the detail. */
const kindOf = (status: number): ApiErrorKind =>
  status === 403 ? 'forbidden' : status === 503 ? 'overloaded' : status === 400 || status === 422 ? 'invalid' : 'unavailable'

/** GET against the Rust tier, or null for the 404 a detail endpoint answers
 * when nothing carries the id.
 *
 * Every other failure throws an ApiError — a socket error, a DNS failure,
 * the timeout, and any non-2xx alike. That is the whole point: an events
 * list that renders empty because the backend was down reads as "no
 * activity", and an operator cannot tell that from a quiet fleet. */
async function get<T>(endpoint: string, path: string, search: EventsQueryWire | Record<string, string | number | undefined> = {}): Promise<T | null> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) if (value !== undefined && value !== '') query.set(key, String(value))
  const url = `${process.env.BACKEND_URL!.replace(/\/$/, '')}${path}${query.size ? `?${query}` : ''}`
  let response: Response
  try {
    response = await fetch(url, { headers: { 'x-service-token': process.env.SERVICE_TOKEN ?? '' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch {
    // Unreachable, refused, or past TIMEOUT_MS. The backend's own words are
    // not available and ours would carry nothing an operator can act on.
    throw new ApiError('unavailable', endpoint)
  }
  if (response.status === 404) return null
  if (!response.ok) {
    const retryAfter = Number(response.headers.get('retry-after'))
    throw new ApiError(kindOf(response.status), endpoint, { ...(Number.isFinite(retryAfter) ? { retryAfter } : {}), ...(await detailOf(response)) })
  }
  return (await response.json()) as T
}

/** The tier's plain-text refusal, when it sent one. Never the request: an
 * echoed URL would put the query — and any token a proxy appended to it —
 * into an error that reaches the page and the log. */
async function detailOf(response: Response): Promise<{ detail?: string }> {
  const body = (await response.text().catch(() => '')).trim()
  return body ? { detail: body.slice(0, 200) } : {}
}

/** The page's event list, off one wire page. */
const paged = (wire: { total: number; offset: number; rows: EventRow[] }): Paged<HoneypotEvent> => ({
  total: wire.total,
  // events.rs clamps the requested offset to 10_000 - size, so paging must
  // follow the offset the response reports rather than the one asked for.
  offset: wire.offset,
  rows: wire.rows.map(pageEvent),
})

// ---- the page fields an event row does not carry -----------------------------

/** `type`, read off the sensor's own event name — the same input the mock's
 * sensor specs classify. The values are the literals the backend's own
 * canonicalizer fixtures and its DISCONNECT filter use; `pivots.alert`
 * (a Suricata signature, read off the wire) makes a row an IDS alert.
 * Everything else falls to `protocol.request`, the page's own catch-all for
 * a non-HTTP application request. */
const TYPE_OF_EVENT: Record<string, EventType> = {
  'cowrie.login.failed': 'login.failed',
  'cowrie.login.success': 'login.success',
  'cowrie.command.input': 'command.input',
  'cowrie.command.failed': 'command.input',
  'cowrie.command.success': 'command.input',
  'cowrie.session.input': 'command.input',
  'cowrie.file.download': 'file.download',
  'cowrie.session.connect': 'connection',
  'cowrie.session.closed': 'connection',
  connect: 'connection',
  disconnect: 'connection',
  listening: 'connection',
  https_listening: 'connection',
  login: 'login.failed',
  auth_attempt: 'login.failed',
  command: 'command.input',
  get: 'http.request',
  post: 'http.request',
  http_request: 'http.request',
}

/** The sensor's own event name, which each sensor writes under its own key:
 * `cowrie.command.input`, `command`, `connect`, … */
function eventNameOf(row: EventRow): string {
  const hp = row.record.honeypot ?? {}
  const name = hp.eventid ?? hp.event
  return typeof name === 'string' ? name : ''
}

/** The seven page fields `toHoneypotEvent` deliberately omits (EventRowGap),
 * because the row carries no value for them. They are filled here, at the
 * seam, because the seam's signatures are the page types:
 *
 * - `type` — classified off the sensor's own event name above.
 * - `severity` — always `info`. The wire classifies no severity for a
 *   generic event: the Go tier's `classify.go` severity did not survive the
 *   Rust port, and the canonical frontend consequently renders no severity
 *   column at all. `info` says "nothing known" rather than "nothing wrong" —
 *   the same reading the repo already gives an uncounted facet. Only a DNP3
 *   control function carries one, and that is `icsSeverity`, mapped already.
 * - `eventName` — the sensor's own event name, verbatim.
 * - `srcPort` — 0. The row carries only the destination port.
 * - `techniques` — empty. The ATT&CK mapping is a pipeline result, not a
 *   field of the row.
 * - `organization` — omitted. `pivots.org` is the ATTACKER's network
 *   organization and is already on `org`; the decoy organization is a
 *   sensor field the row does not carry.
 * - `city` — "". The row carries `source.geo.country_iso_code` only.
 *
 * A GAP, not a conversion: the explorer's Severity column and the event
 * page's kind token show "info" and a best-effort kind against real data,
 * where they show a real classification against the mock.
 */
function pageEvent(row: EventRow): HoneypotEvent {
  const name = eventNameOf(row)
  // Typed as exactly the gap the row cannot fill, so a renamed page field
  // fails the compiler here rather than reaching a page undefined.
  const gap: Pick<HoneypotEvent, EventRowGap> = {
    type: row.pivots.alert ? 'ids.alert' : (TYPE_OF_EVENT[name] ?? 'protocol.request'),
    severity: 'info',
    srcPort: 0,
    eventName: name,
    techniques: [],
    city: '',
  }
  // The one cast in this module, and the compiler forces it:
  // `Omit<HoneypotEvent, EventRowGap>` is structurally vacuous, because
  // HoneypotEvent carries a `Record<string, unknown>` index signature — so
  // `keyof` is `string | number`, `Omit` has nothing to subtract, and the
  // spread above typechecks as a bag of unknowns rather than an event. The
  // fields are genuinely all present; only the omission's promise of which
  // ones cannot be expressed. `organization` is the seventh gap field and
  // is left off: absent, not empty, as toHoneypotEvent does throughout.
  return { ...toHoneypotEvent(row), ...gap } as HoneypotEvent
}

// ---- the wire queries -------------------------------------------------------

const getEvents: Backend['getEvents'] = async (filters) => {
  const [rows, values] = await Promise.all([
    get<EventsPageWire>('getEvents', '/api/v1/events', eventsQueryWindowed(filters, filters)),
    get<FilterValuesWire>('getEvents', '/api/v1/filter-values'),
  ])
  // Built here rather than with `eventsPage`, which maps the rows straight
  // through `toHoneypotEvent` and would leave the seven gap fields — the
  // explorer's Severity column among them — undefined on every live row.
  // `values` are the filter pickers' vocabularies: the endpoint serves keys
  // only (no counts), and has no aggregation at all for sources, personas,
  // providers or signatures, which is why `getFacets` stays mock-only.
  return { ...paged(rows ?? EMPTY_PAGE), values: filterValues(values ?? EMPTY_VALUES) }
}

const getCommands: Backend['getCommands'] = async (page) => paged((await get<EventsPageWire>('getCommands', '/api/v1/events', commandsQuery(page))) ?? EMPTY_PAGE)

const searchHistory: Backend['searchHistory'] = async (query, page) => {
  // The page's query is a history search: free text over a wide window, not
  // a filter bar. `q` and `since` have no EventFilters field, so they are
  // added over the adapter's params rather than widened into it. `90d` is
  // three ASCII alphanumerics, inside events.rs's accepted `since` shape
  // (any value outside it is silently dropped for a 10-day window).
  if (!query.trim()) return { rows: [], total: 0, offset: 0 }
  const params: EventsQueryWire = { ...eventsQuery({}), ...eventsQueryWindowed({}, page ?? {}), q: query.trim(), since: '90d' }
  return paged((await get<EventsPageWire>('searchHistory', '/api/v1/events', params)) ?? EMPTY_PAGE)
}

const getEventDetail: Backend['getEventDetail'] = async (id) => {
  const wire = await get<EventPageWire>('getEventDetail', `/api/v1/event/${encodeURIComponent(id)}`)
  if (!wire) return null
  return {
    ...eventDetail(wire, detailRow(wire), readingOf(wire.sensor)),
    // `eventDetail` returns the caller's row through `toHoneypotEvent`,
    // which omits the seven gap fields; the page's own type needs them.
    event: pageEvent(detailRow(wire)),
  }
}

/** The row shape `toHoneypotEvent` reads, rebuilt from what
 * GET /api/v1/event/{id} actually serves.
 *
 * The detail endpoint builds its body by reading the document directly
 * rather than through `events::row_from_hit`, so it carries no pivots, no
 * port, no proto and no per-sensor detail — the four fields the row
 * conversion reads most of itself from. /api/v1/events has no id parameter,
 * so the row cannot be fetched by id either. Hence a row of the endpoint's
 * own fields with those four left empty: the event page shows the id, time,
 * sensor, source, session, hash list and full record, and its detail line
 * and kind/severity are the ones the wire cannot fill. */
const detailRow = (wire: EventPageWire): EventRow => ({
  id: wire.id,
  time: wire.time,
  sensor: wire.sensor,
  src_ip: wire.src_ip,
  country: '',
  port: '',
  proto: '',
  detail: '',
  session: wire.session,
  pivots: {
    persona: '', site: '', asset: '', fingerprint: '', fingerprint_kind: '', command: '', user: '', pass: '', path: '', shasum: '',
    asn: '', org: '', provider: '', alert: '', category: '', payload_class: '', tty_replay: '', ics_severity: '',
  },
  record: wire.record,
})

const getSessionDetail: Backend['getSessionDetail'] = async (id) => {
  const wire = await get<SessionDetailWire>('getSessionDetail', `/api/v1/sessions/${encodeURIComponent(id)}`)
  if (!wire) return null
  const detail = sessionDetail(wire)
  // `sequences` (the two curated multi-step detections) have no page field
  // and the adapter drops them; `recordingShasum` is not on the wire at all.
  return { ...detail, events: wire.events.map(pageEvent) }
}

const getRecordings: Backend['getRecordings'] = async (ip) => {
  // The recordings page counts `rows.length`, not a total, so this asks for
  // one full page — the handler's own cap is 100 — rather than pretending
  // to page something the page does not page.
  const wire = await get<RecordingsPageWire>('getRecordings', '/api/v1/recordings', { offset: 0, size: 100, ip })
  return recordingRows(wire ?? { total: 0, rows: [] })
}

const getReplayDetail: Backend['getReplayDetail'] = async (shasum) => {
  const [wire, page] = await Promise.all([
    get<ReplayWire>('getReplayDetail', `/api/v1/recordings/${encodeURIComponent(shasum)}`),
    get<RecordingsPageWire>('getReplayDetail', '/api/v1/recordings', { offset: 0, size: 100 }),
  ])
  // One recording is shared by every session that produced the same bytes,
  // so the sessions are the rows carrying this shasum. `ttylog_base64` has
  // no page field and the adapter drops it rather than adding one to reach
  // it; the attacker block needs /api/v1/investigate/ip/{ip}, which is the
  // sources slice's seam, so it stays null.
  return replayDetail(wire, recordingRows(page ?? { total: 0, rows: [] }).filter((row) => row.shasum === shasum))
}

const searchAll: Backend['searchAll'] = async (query) => {
  if (!query.trim()) return []
  // The wire groups its own hits and caps each group at 8, carrying the rest
  // as a count plus an overflow link — which is `moreHref`. It ranks nothing;
  // groups arrive in the handler's fixed order.
  const wire = await get<SearchResultWire>('searchAll', '/api/v1/search', { q: query.trim() })
  return searchGroups(wire ?? { query, redirect: null, groups: [], total: 0 })
}

/** This slice's queries, and nothing else. Each keeps the mock
 * implementation's signature exactly — `queries.ts` is generated from it and
 * pages are typed against it. */
const LIVE: Partial<Record<keyof Backend, (...args: never[]) => Promise<unknown>>> = {
  getEvents,
  getCommands,
  searchHistory,
  getEventDetail,
  getSessionDetail,
  getRecordings,
  getReplayDetail,
  searchAll,
}

/** The guarded live implementation of `name`, or undefined when this slice
 * does not implement it, when a mock scenario is in force, or when no
 * BACKEND_URL is configured — the three cases the mock keeps answering.
 *
 * The authorization decision is the same one `backend()` applies, so a role
 * is refused identically whichever tier answers. */
export function liveQuery(name: string, user: Caller): ((...args: unknown[]) => Promise<unknown>) | undefined {
  if (!isLiveBackend()) return undefined
  const query = LIVE[name as keyof Backend] as ((...args: unknown[]) => Promise<unknown>) | undefined
  if (!query) return undefined
  return async (...args) => {
    if (user !== undefined) {
      const decision = authorize(name, user)
      if (decision === 'sign-in') throw new ApiError('expired', name)
      if (decision === 'admin-only') throw new ApiError('forbidden', name)
    }
    return query(...args)
  }
}

/** The names this module answers, for the report and the tests. */
export const liveQueryNames = (): string[] => Object.keys(LIVE)

/** Re-exported for the test that asserts the response handling degrades
 * rather than throwing on a body the endpoints really send. */
export const __testing = { paged, pageEvent, get, EMPTY_PAGE }