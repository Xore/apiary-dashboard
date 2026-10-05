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
import { reportTemplates } from './adapters/reports'
import { DEFAULT_PREFERENCES_WIRE, capturedMail, configProblems, configRollbackBody, configSectionBody, configSectionPath, configValidateBody, problemReportBody, problemReports, problemStatusPatch, settingsData, shellConfig } from './adapters/settings'
import { readingOf } from './mock/sensors'
import { authorize } from '#/server/authorize'
import { isRead, READ_ONLY_EXEMPT } from './scenario'
import type { ApiErrorKind } from './errors'
import type { EventPageWire, EventsQueryWire, FilterValuesWire, RecordingsPageWire, ReplayWire, SearchResultWire, SessionDetailWire } from './contracts/explorer'
import type { EventRow, EventsPage as EventsPageWire } from './contracts/events'
import type { ReportTemplatesWire } from './contracts/reports'
import type { AuditWire, ConfigHistoryWire, ConfigValidateWire, ConfigWire, MailWire, ProblemReportCreatedWire, ProblemReportsPageWire, ReporterStatsWire, ServiceActionWireResponse, ServicesWire, StorageWire, UsersWire } from './contracts/settings'
import type { Backend, Caller } from './backend'
import type { EventType, HoneypotEvent, Paged, SessionUser, ShellConfig } from './types'

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
async function get<T>(endpoint: string, path: string, search: QueryParams = {}): Promise<T | null> {
  return request<T>(endpoint, { path, search })
}

/** What any call may send as a query string. `EventsQueryWire` is the named
 * one from #75; the loose record is the settings slice's params, which have
 * no shared shape worth a type. */
type QueryParams = EventsQueryWire | Record<string, string | number | undefined>

/** The one call this module makes. GET unless `method`/`body` say otherwise;
 * the token rides as a header on every one of them, and never in a URL. */
async function request<T>(endpoint: string, { method = 'GET', path, search = {}, body, headers = {} }: { method?: string; path: string; search?: QueryParams; body?: unknown; headers?: Record<string, string> }): Promise<T | null> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) if (value !== undefined && value !== '') query.set(key, String(value))
  const url = `${process.env.BACKEND_URL!.replace(/\/$/, '')}${path}${query.size ? `?${query}` : ''}`
  let response: Response
  try {
    response = await fetch(url, { method, headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), 'x-service-token': process.env.SERVICE_TOKEN ?? '', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(TIMEOUT_MS) })
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
  // 204 and an empty 200 carry nothing; the writes that answer `Json(doc)`
  // are read back by the page from its own reload.
  const text = await response.text().catch(() => '')
  return text ? (JSON.parse(text) as T) : null
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

// ---- the settings slice -----------------------------------------------------

/** The session behind the request's cookie, read once per call and used for
 * both facts this slice needs from it: the identity the pages render
 * (`SettingsData.user`) and the SUBJECT the wire attributes writes to.
 *
 * `SessionUser` carries a display name and an email but no subject — the
 * subject lives one layer down, in the session record (src/server/session.ts
 * `Session.sub`). The Rust tier has no session concept: it takes
 * `actor_subject` / `actor_username` as params or body fields on the stated
 * trust model that this process is the only caller and the service token
 * gates it (preferences.rs's module doc, config.rs `ActorQuery`). So the
 * store is read here rather than a subject being invented; a store that does
 * not answer yields empty actor fields, which records a blank actor — worse
 * than no attribution, never worse than a fabricated one.
 *
 * The queries take no caller argument (their signatures are the contract), so
 * this re-resolves the session the funnel already resolved. One extra store
 * read on the slice's writes, against correctness we would otherwise have to
 * fake. */
async function sessionOf(): Promise<{ user: SessionUser | null; subject: string; username: string }> {
  try {
    const [{ getRequest }, { sessions, sidFrom }, { userOf }] = await Promise.all([import('@tanstack/react-start/server'), import('#/server/session'), import('#/server/identity')])
    const session = await sessions.get(sidFrom(getRequest()))
    return session ? { user: userOf(session), subject: session.sub, username: session.username } : { user: null, subject: '', username: '' }
  } catch {
    return { user: null, subject: '', username: '' }
  }
}

/** The nine documents `getSettings` reads, fanned out as one page.
 *
 * One failing leg fails the whole read rather than handing the page a
 * half-built `SettingsData`: an admin panel built from partly-dead stores
 * lies worse than a missing one, and a silently-defaulted `revision: 0` is
 * worse still — it is a real baseline that every later save then conflicts
 * against, blaming a concurrent editor who never existed. The canonical
 * frontend draws the same line (frontend-next `fetchAdminData`, #2311), so
 * this is `Promise.all` and the rejection is the `ApiError` the page's error
 * boundary already tells apart.
 *
 * `/api/v1/preferences` is NOT among the nine: see `getPreferences` below. */
const getSettings: Backend['getSettings'] = async () => {
  const [config, users, history, audit, services, reporter, storage, templates, session] = await Promise.all([
    get<ConfigWire>('getSettings', '/api/v1/config'),
    get<UsersWire>('getSettings', '/api/v1/users'),
    get<ConfigHistoryWire>('getSettings', '/api/v1/config/history'),
    get<AuditWire>('getSettings', '/api/v1/audit', { limit: 100 }),
    get<ServicesWire>('getSettings', '/api/v1/services'),
    get<ReporterStatsWire>('getSettings', '/api/v1/reporter-stats'),
    get<StorageWire>('getSettings', '/api/v1/settings/storage'),
    get<ReportTemplatesWire>('getSettings', '/api/v1/reports/templates'),
    sessionOf(),
  ])
  return settingsData({
    // The signed-in operator. The wire has no session, so it comes from the
    // one this process holds — the same SessionUser the mock answers `user`
    // with, so the identity panel reads the same whichever tier answered.
    user: session.user ?? ANONYMOUS_USER,
    config: config ?? { revision: 0, payload: {} },
    templates: reportTemplates(templates ?? { templates: [], elements: [] }).templates,
    users: users ?? { users: [] },
    // The backend's own `default_preferences`, NOT the wire's per-subject
    // document: `GET /api/v1/preferences` needs a subject and is a
    // PUBLIC_QUERY (authorize.ts:9 — the navigation guard and the sign-in
    // pages call it before sign-in), so it is deliberately NOT wired here.
    // See `getPreferences` below for the full reasoning. These are the
    // defaults the appearance pane edits, so the page renders real values.
    preferences: DEFAULT_PREFERENCES_WIRE,
    services: services ?? { available: false, services: [] },
    history: history ?? { entries: [] },
    audit: audit ?? { events: [] },
    reporter: reporter ?? { available: false },
    storage: storage ?? { cluster_status: 'unreachable', index_count: 0, doc_count: 0, store_bytes: 0 },
  })
}

/** What the identity panel shows for a caller no session resolved. The mock
 * has a fixture user; a live call that reached here has no session at all,
 * and saying so beats borrowing a name. */
const ANONYMOUS_USER: SessionUser = { name: '—', email: '', roles: [] }

/** `GET /api/v1/config` for the shell: the presentation and behavior blocks
 * every page renders with.
 *
 * `links` has no endpoint — that is canonical's finding, verified rather
 * than assumed: frontend-next builds all three from its own process
 * environment (`fetchInvestigationConfig`, events.tsx), an explicit
 * `KIBANA_PUBLIC_URL` / `EVEBOX_PUBLIC_URL` / `ARKIME_PUBLIC_URL` winning
 * outright over `https://{tool}.{HONEYPOT_DOMAIN}`. Deployment config, not
 * telemetry, so it is read from the environment here too. A tool that is
 * neither configured nor derivable is left out rather than guessed at.
 *
 * `accountConsole` stays absent: canonical derives it from the OIDC issuer
 * (oidc.server.ts `accountConsoleActions`) and this tier has no issuer
 * configuration — `OIDC_DISABLED` is a yes/no, not a URL. An absent link is
 * a missing button, never a wrong one. */
const getShellConfig: Backend['getShellConfig'] = async () => {
  const wire = await get<ConfigWire>('getShellConfig', '/api/v1/config')
  return shellConfig(wire ?? { revision: 0, payload: {} }, deploymentLinks())
}

function deploymentLinks(env: NodeJS.ProcessEnv = process.env): ShellConfig['links'] {
  const domain = (env.HONEYPOT_DOMAIN ?? '').trim().replace(/\.+$/, '')
  const base = (tool: string, explicit: string | undefined) => {
    const trimmed = (explicit ?? '').trim()
    return trimmed || (domain ? `https://${tool}.${domain}` : '')
  }
  const kibana = base('kibana', env.KIBANA_PUBLIC_URL)
  const evebox = base('evebox', env.EVEBOX_PUBLIC_URL)
  const arkime = base('arkime', env.ARKIME_PUBLIC_URL)
  return { ...(kibana ? { kibana } : {}), ...(evebox ? { evebox } : {}), ...(arkime ? { arkime } : {}) }
}

/** POST /api/v1/config/validate — the persist-nothing preview the debounced
 * editor asks for. A refused section is a 200 carrying `problems`, which is
 * a result and not an error; only an unreachable validator throws, and the
 * page treats that as "no preview" (its save still decides). */
const validateConfig: Backend['validateConfig'] = async (section, value) => {
  const wire = await request<ConfigValidateWire>('validateConfig', { method: 'POST', path: '/api/v1/config/validate', body: configValidateBody(section, value) })
  return configProblems(wire ?? { ok: true, problems: [] })
}

/** PUT /api/v1/config/{section} (or `/presentation`, which is the same
 * handler on its own route) — one section, replaced whole, since the handler
 * assigns `doc.payload[key] = value` rather than merging.
 *
 * No `If-Match`: the optimistic-concurrency precondition is optional, and
 * config.rs's absent-header path is explicitly the last-write-wins one. The
 * page's signature carries no revision to check against, and inventing one
 * would make every save a conflict check the UI has no state to resolve.
 * A 409 therefore cannot arise, and a validation refusal cannot either:
 * `put_config_field` stores whatever it is given and the validator only runs
 * on the separate `/config/validate` route — so a refusal here is a genuine
 * fault, and it is thrown rather than dressed up as a per-field problem the
 * page would show against the wrong field. */
const saveConfigSection: Backend['saveConfigSection'] = async (section, value) => {
  await guardReadOnly('saveConfigSection')
  const { subject, username } = await sessionOf()
  const path = configSectionPath(section)
  const wire = await request<ConfigWire>('saveConfigSection', { method: 'PUT', path: `/api/v1/config/${path}`, search: { actor_subject: subject, actor_username: username }, body: configSectionBody(section, value) })
  return { ok: true, revision: wire?.revision ?? 0 }
}

/** POST /api/v1/config/rollback. The wire's revision is an integer; the
 * page's history row renders it (the adapter's `id` is `String(revision)`,
 * and the mock uses `rev-41`). Both parse — the prefix is the page's own
 * decoration, not a wire key. Anything that is not a revision is refused
 * here rather than sent as one the backend would reject as negative
 * (config.rs `rollback` 400s `revision < 0`). */
const rollbackConfig: Backend['rollbackConfig'] = async (revisionId) => {
  await guardReadOnly('rollbackConfig')
  const revision = configRollbackBody(revisionId)
  if (!revision) throw new ApiError('invalid', 'rollbackConfig', { detail: `${revisionId} is not a revision` })
  const { subject, username } = await sessionOf()
  await request<ConfigWire>('rollbackConfig', { method: 'POST', path: '/api/v1/config/rollback', body: { ...revision, actor_subject: subject, actor_username: username } })
}

/** POST /api/v1/services/{name}/{action}.
 *
 * This restarts containers — in a normal deployment, the very stack this
 * dashboard is served from. It is wired because it is what the operator
 * asked for and what canonical serves, admin-gated by `ADMIN_QUERIES`, and
 * a failure is the backend's own status rather than a swallowed one: the
 * handler answers 503 when the services adapter is unconfigured and 400 for
 * an action it does not accept, both of which reach the page as errors.
 * Enabling this anywhere non-disposable is a deployment decision, not a
 * code one. */
const runServiceAction: Backend['runServiceAction'] = async (name, action) => {
  await guardReadOnly('runServiceAction')
  const { subject, username } = await sessionOf()
  const wire = await request<ServiceActionWireResponse>('runServiceAction', { method: 'POST', path: `/api/v1/services/${encodeURIComponent(name)}/${action}`, search: { actor_subject: subject, actor_username: username } })
  if (wire && wire.ok === false) throw new ApiError('unavailable', 'runServiceAction', { detail: wire.error })
}

/** GET /api/v1/mail/{id} — one document serves both the summary and the
 * detailed read. A 404 is the page's own "no message for this session",
 * which is an answer about the session rather than a failure. */
const getMail: Backend['getMail'] = async (sessionId) => {
  const wire = await get<MailWire>('getMail', `/api/v1/mail/${encodeURIComponent(sessionId)}`)
  return wire ? capturedMail(wire) : null
}

/** GET /api/v1/store/problem-reports — the allowlisted generic store
 * passthrough, which is where the list comes from: the Rust tier serves only
 * the POST and the PATCH under `/api/v1/problem-reports`, exactly as
 * canonical's own page reads them. `size` is the handler's own cap. */
const getProblemReports: Backend['getProblemReports'] = async () => {
  const wire = await get<ProblemReportsPageWire>('getProblemReports', '/api/v1/store/problem-reports', { offset: 0, size: 100 })
  return problemReports(wire ?? { total: 0, rows: [] })
}

/** POST /api/v1/problem-reports. The server redacts and truncates
 * everything here before it is stored — this is not a second redaction pass,
 * the trust boundary is on that side. */
const submitProblemReport: Backend['submitProblemReport'] = async (input) => {
  await guardReadOnly('submitProblemReport')
  const { subject, username } = await sessionOf()
  const wire = await request<ProblemReportCreatedWire>('submitProblemReport', { method: 'POST', path: '/api/v1/problem-reports', search: { actor_subject: subject, actor_username: username }, body: problemReportBody(input) })
  return { id: wire?.id ?? '' }
}

/** PATCH /api/v1/problem-reports/{id} — 204, or a 404 for a report that is
 * not there. A status the store has no room for is folded to its wire
 * equivalent by the adapter, so the page's four statuses stay reachable. */
const setProblemStatus: Backend['setProblemStatus'] = async (id, status) => {
  await guardReadOnly('setProblemStatus')
  await request<null>('setProblemStatus', { method: 'PATCH', path: `/api/v1/problem-reports/${encodeURIComponent(id)}`, body: problemStatusPatch(status) })
}

/** Read-only mode, enforced the way the mock enforces it.
 *
 * `scenario.ts` refuses a non-read write with a 423 when
 * `CONFIG.behavior.readOnly` is on — but it wraps the MOCK. A live call
 * bypasses that entirely, and nothing in the Rust tier enforces read-only at
 * all: it is a dashboard preference, not a backend guarantee. So without
 * this the guard would silently apply to the mock tier only, which is the
 * worst shape a guard can have — it passes the tests and stops existing in
 * production. One config read per write buys the same 423 the mock gives.
 *
 * The predicate is the mock's own, inverted exactly as scenario.ts:72 inverts
 * it: a query whose name IS a read is not guarded, and a query that is not
 * one is. `READ_ONLY_SKIP` is the one addition, because the name alone does
 * not say what the query does — `getMail` STARTS WITH `get` and would read as
 * a read, but it is the page's read of a capture; it needs no exemption and
 * gets none. What DOES need one is already listed: `saveConfigSection` and
 * `rollbackConfig` are how read-only gets turned off. */
async function guardReadOnly(name: string): Promise<void> {
  if (isRead(name) || READ_ONLY_EXEMPT.has(name)) return
  const wire = await get<ConfigWire>(name, '/api/v1/config')
  if (wire?.payload.behavior?.read_only) throw new ApiError('locked', name)
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
 * pages are typed against it.
 *
 * DELIBERATELY ABSENT, and the reason is the one thing in this slice worth
 * reading before changing anything:
 *
 * - `getPreferences` — a PUBLIC_QUERY (authorize.ts:9). The navigation guard
 *   resolves it on every navigation and the sign-in pages render with it, so
 *   it runs BEFORE sign-in. The real `GET /api/v1/preferences` needs the
 *   service token AND a subject: an empty subject is a 400 (preferences.rs
 *   `subject` validation). A pre-sign-in call has no subject, so wiring it
 *   turns the sign-in page into a 400 on every load — the deadlock the task
 *   brief names. Canonical does not reach the backend here either: it builds
 *   the pre-session values from its own process environment. So this leaves
 *   it, and both `savePreferences` with it, on the mock. Wiring one half of
 *   the pair is worse than wiring neither — the pane would save to one store
 *   and render from another.
 *
 * - `savePreferences` — same document, same reason. `PUT
 *   /api/v1/preferences` merges a `deny_unknown_fields` patch, so it can be
 *   wired without the read; it is not, because it would then write the wire
 *   while `getPreferences` renders the mock.
 *
 * - `getAttackers` / `getFacets` / `getSourceHealth` — other slices' work,
 *   or no endpoint at all (filter-values serves keys only, with no counts). */
const LIVE: Partial<Record<keyof Backend, (...args: never[]) => Promise<unknown>>> = {
  getEvents,
  getCommands,
  searchHistory,
  getEventDetail,
  getSessionDetail,
  getRecordings,
  getReplayDetail,
  searchAll,
  getSettings,
  getShellConfig,
  validateConfig,
  saveConfigSection,
  rollbackConfig,
  runServiceAction,
  getMail,
  getProblemReports,
  submitProblemReport,
  setProblemStatus,
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