// The real backend behind the events & sessions slice (#75): the request
// builders, the response handling against a fixture per endpoint, and the
// states a failed fetch must produce.
//
// The regression this file exists for: a failed fetch rendering as an EMPTY
// LIST rather than an error. An events page with no rows reads as a quiet
// fleet, and an operator cannot tell that from a backend that is down — so
// every failure path here asserts an ApiError, and the empty assertions are
// about a body the backend really sends, never about a failed call.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { isLiveBackend, liveQuery, liveQueryNames } from './api'
import { commandsQuery, eventsQuery, recordingSourceIpQuery } from './adapters/explorer'
import type { EventPageWire, FilterValuesWire, RecordingsPageWire, ReplayWire, SearchResultWire, SessionDetailWire } from './contracts/explorer'
import type { EventRow } from './contracts/events'
import type { Backend } from './backend'

/** One wire row, as events.rs's `row_from_hit` builds it. */
const pivots = {
  persona: '', site: '', asset: '', fingerprint: 'curl/8.5.0', fingerprint_kind: 'User-Agent',
  command: 'uname -a', user: 'root', pass: 'toor', path: '', shasum: '',
  asn: 'AS64496', org: 'Example Transit', provider: 'hosting', alert: '', category: '',
  payload_class: '', tty_replay: '', ics_severity: '',
}

const row: EventRow = {
  src_ip_claimed: '', id: 'ev_9f2c1a', time: '2026-10-04T20:41:03Z', sensor: 'cowrie',
  src_ip: '203.0.113.42', country: 'NL', port: '22', proto: 'ssh',
  detail: 'command.input: uname -a', session: 'sess-77a1', pivots,
  record: { honeypot: { eventid: 'cowrie.command.input', input: 'uname -a' }, network: { protocol: 'ssh' } },
}

const page = { total: 1, offset: 0, rows: [row], fingerprint_ips: null }
const values: FilterValuesWire = { sensors: ['cowrie'], countries: ['NL'], cities: ['Amsterdam'], protos: ['ssh'], ports: ['22'], kinds: ['command'] }
const sessionWire: SessionDetailWire = {
  id: 'sess-77a1', ip: '203.0.113.42', country: 'NL', first: '2026-10-04T20:00:00Z', last: '2026-10-04T20:41:03Z',
  total: 1, sensors: [{ key: 'cowrie', count: 1 }], commands: [{ key: 'uname -a', count: 1 }], credentials: [], payloads: [],
  techniques: [], sequences: [], events: [row],
}
const eventPageWire: EventPageWire = {
  id: 'ev_9f2c1a', index: 'honeypot-v2-2026.10.04', time: row.time, sensor: 'cowrie', src_ip: row.src_ip,
  session: 'sess-77a1', community_id: '1:abc', hashes: ['d41d8cd98f00b204e9800998ecf8427e'], record: row.record,
  session_events: { key: 'sess-77a1', total: 12, rows: [] }, flow_events: { key: '', total: 0, rows: [] },
  source_events: { key: '203.0.113.42', total: 340, rows: [] }, flow_link: null,
}
const recordingPage: RecordingsPageWire = {
  total: 1,
  rows: [{ when: row.time, src_ip: row.src_ip, country: 'NL', session: 'sess-77a1', shasum: 'ab12cd34', size_bytes: 8192, duration_ms: 42_000 }],
}
const replayWire: ReplayWire = {
  shasum: 'ab12cd34', size_bytes: 8192, imported_at: row.time, frames: 118, duration_seconds: 41.5,
  transcript: 'Linux honeypot 6.1\r\n', ttylog_base64: 'AAAAAA==',
}
const searchWire: SearchResultWire = {
  query: 'uname', redirect: null, total: 1,
  groups: [{ title: 'Commands', hits: [{ label: 'uname -a', count: 12, url: '/events?cmd=uname%20-a' }], more: 340, more_url: '/history?q=uname' }],
}

/** Serves one body per path, and records the URLs it was asked for. The
 * longest matching prefix wins, so a fixture set does not have to be written
 * in path order — `/api/v1/config` and `/api/v1/config/history` are both
 * real, and which one answers must not depend on object key order. */
function stub(responses: Record<string, unknown | (() => never)>) {
  const calls: string[] = []
  const prefixes = Object.entries(responses).sort(([a], [b]) => b.length - a.length)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url)
      const path = new URL(url).pathname
      const body = prefixes.find(([prefix]) => path.startsWith(prefix))
      if (!body) throw new TypeError(`no fixture for ${path}`)
      const value = body[1]
      if (typeof value === 'function') return value()
      return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
    }),
  )
  return calls
}

const fail = (status: number, body = 'boom', headers: Record<string, string> = {}) => () =>
  new Response(body, { status, headers })

/** The live query, with BACKEND_URL set as the opt-in, typed as the seam
 * function it stands in for — so a signature drift in queries.impl.ts fails
 * the compiler here rather than at the page. */
const live = <TQuery extends keyof Backend>(name: TQuery): Backend[TQuery] => {
  process.env.BACKEND_URL = 'http://backend.test'
  return liveQuery(name, undefined) as Backend[TQuery]
}

beforeEach(() => {
  process.env.SERVICE_TOKEN = 'test-token'
  process.env.BACKEND_URL = 'http://backend.test'
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.BACKEND_URL
  delete process.env.SERVICE_TOKEN
})

describe('which queries the real backend answers', () => {
  it('names only the wired slices, leaving the rest to the mock', () => {
    expect(liveQueryNames().sort()).toEqual(
      [
        // events & sessions (#75)
        'getCommands',
        'getEventDetail',
        'getEvents',
        'getRecordings',
        'getReplayDetail',
        'getSessionDetail',
        'searchAll',
        'searchHistory',
        // settings, preferences and shell (#81)
        'getMail',
        'getProblemReports',
        'getSettings',
        'getShellConfig',
        'rollbackConfig',
        'runServiceAction',
        'saveConfigSection',
        'setProblemStatus',
        'submitProblemReport',
        'validateConfig',
        // evidence & analysis (#78)
        'abortGpuJob',
        'getAnalysisResults',
        'getAnalyzerCatalog',
        'getArtifacts',
        'getArtifactFile',
        'getCapeRun',
        'getCapeRuns',
        'getGithubAnalyses',
        'getGithubAnalysis',
        'getGhidraAnalysis',
        'getPayloadAnalysis',
        'getPayloads',
        'getRevDeckRun',
        'getRevDeckRuns',
        'getSandboxLiveStatus',
        'getSandboxRun',
        'queuePayloadAction',
        'setRunChild',
        'startAnalysisRun',
        // operations (#77)
        'acknowledgeAllAlerts',
        'getAlertDetail',
        'getAlerts',
        'getDeadLetters',
        'getOpenAlertCount',
        'getSensorCatalog',
        'getSensorDetail',
        'getSourceHealth',
        'getTopology',
        'purgeDeadLetters',
        'setAlertsAcknowledged',
      ].sort(),
    )
  })

  it('answers nothing without BACKEND_URL — the mock stays the default', () => {
    delete process.env.BACKEND_URL
    expect(isLiveBackend()).toBe(false)
    expect(liveQuery('getEvents', undefined)).toBeUndefined()
    process.env.BACKEND_URL = '   '
    expect(isLiveBackend()).toBe(false)
  })

  it('answers nothing for a query this slice has not wired', () => {
    // Still mock-only after #77: no backend endpoint serves either.
    expect(liveQuery('getOverview', undefined)).toBeUndefined()
    expect(liveQuery('getAttackers', undefined)).toBeUndefined()
  })

  it('leaves getPreferences and savePreferences on the mock — the public-query deadlock', () => {
    // The trap #81 exists to not fall into. `getPreferences` is a
    // PUBLIC_QUERY: the navigation guard calls it on every navigation and
    // the sign-in pages render with it, so it runs BEFORE a subject exists.
    // The real endpoint needs one (an empty subject is a 400), so wiring it
    // breaks sign-in itself. Both halves stay on the mock, deliberately —
    // wiring only the write would save to the wire and render from the mock.
    expect(liveQuery('getPreferences', undefined)).toBeUndefined()
    expect(liveQuery('savePreferences', undefined)).toBeUndefined()
    expect(liveQueryNames()).not.toContain('getPreferences')
  })

  it('applies the same authorization decision the mock does', async () => {
    stub({ '/api/v1/events': page, '/api/v1/filter-values': values })
    const viewer = { id: 'u', name: 'A', email: 'a@example.test', roles: ['viewer' as const] }
    expect(await liveQuery('getEvents', viewer)!({})).toMatchObject({ total: 1 })
    // Nobody signed in is refused the same way the mock refuses them, before
    // any fetch — the live path is not a way around the guard.
    await expect(liveQuery('getEvents', null)!({})).rejects.toThrow(ApiError)
  })
})

describe('the requests it builds', () => {
  it('sends every page filter as the param events.rs declares', async () => {
    const calls = stub({ '/api/v1/events': page, '/api/v1/filter-values': values })
    await live('getEvents')({ ip: '203.0.113.42', sensor: 'cowrie', country: 'NL', since: '24h', offset: 0, limit: 25 })
    const url = new URL(calls[0])
    expect(url.pathname).toBe('/api/v1/events')
    expect(Object.fromEntries(url.searchParams)).toEqual({ offset: '0', size: '25', ip: '203.0.113.42', sensor: 'cowrie', country: 'NL', since: '24h' })
  })

  it('asks the endpoint default page size when the caller sets no limit', async () => {
    // events.rs defaults `size` to 25 and clamps it to 100; an absent limit
    // is not an unbounded page.
    const calls = stub({ '/api/v1/events': page, '/api/v1/filter-values': values })
    await live('getEvents')({})
    expect(new URL(calls[0]).searchParams.has('size')).toBe(false)
  })

  it('narrows a comma list to its first value, and drops the params the API has no field for', async () => {
    // `ips` is the wire's only multi-valued address parameter and no page
    // filter holds it, so `?ip=a,b` narrows to `a` — a documented loss the
    // adapter records, not a silent mangling.
    const calls = stub({ '/api/v1/events': page, '/api/v1/filter-values': values })
    await live('getEvents')({ ip: '203.0.113.42,198.51.100.4' })
    const params = new URL(calls[0]).searchParams
    expect(params.get('ip')).toBe('203.0.113.42')
    expect(params.has('ips')).toBe(false)
    // A filter the page can set that events.rs does not declare must not go
    // on the wire at all: an undeclared param is silently ignored there, so
    // sending one narrows nothing and reads as "the filter is ignored".
    expect(eventsQuery({ provider: 'hosting' }).provider).toBe('hosting')
    expect(Object.keys(eventsQuery({}))).toEqual(['offset'])
  })

  it('pages with the offset the response reports, not the one requested', async () => {
    stub({ '/api/v1/events': page, '/api/v1/filter-values': values })
    // events.rs clamps offset to 10_000 - size.
    const out = await live('getEvents')({ offset: 9999, limit: 25 })
    expect(out.offset).toBe(0)
    const clamped = await (async () => {
      stub({ '/api/v1/events': { ...page, offset: 9975 }, '/api/v1/filter-values': values })
      return live('getEvents')({ offset: 9999, limit: 25 })
    })()
    expect(clamped.offset).toBe(9975)
  })

  it('pins the commands list to the exact honeypot.event term, as the backend own CSV export does', async () => {
    // Verified against exports.rs commands_csv, which pins q.kind = "command"
    // and renders "the same events?kind=command scope commands.tsx renders".
    const calls = stub({ '/api/v1/events': page })
    await live('getCommands')({ offset: 25, limit: 25 })
    expect(Object.fromEntries(new URL(calls[0]).searchParams)).toEqual({ kind: 'command', offset: '25', size: '25' })
    expect(commandsQuery()).toEqual({ kind: 'command', offset: 0, size: 25 })
  })

  it('widens the recording attribution window past the endpoint 10-day default', async () => {
    // since_to_range accepts only non-empty, <=8 chars, all ASCII
    // alphanumeric. '365d' is four, so it survives; '1h30m' would not.
    expect(recordingSourceIpQuery('ab12cd34').since).toBe('365d')
    const calls = stub({ '/api/v1/events': page })
    await live('searchHistory')('uname', { offset: 0, limit: 50 })
    expect(Object.fromEntries(new URL(calls[0]).searchParams)).toEqual({ offset: '0', size: '50', q: 'uname', since: '90d' })
  })

  it('sends the service token as a header, never in the URL', async () => {
    const calls = stub({ '/api/v1/events': page, '/api/v1/filter-values': values })
    await live('getEvents')({})
    expect(calls[0]).not.toContain('test-token')
    const fetchMock = vi.mocked(globalThis.fetch)
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ 'x-service-token': 'test-token' })
  })
})

describe('the responses it maps', () => {
  it('maps the explorer page, filling only what the row cannot carry', async () => {
    stub({ '/api/v1/events': page, '/api/v1/filter-values': values })
    const out = await live('getEvents')({})
    expect(out).toMatchObject({ total: 1, values: { sensors: ['cowrie'], countries: ['NL'], ports: [22] } })
    expect(out.rows[0]).toMatchObject({ id: 'ev_9f2c1a', srcIp: '203.0.113.42', dstPort: 22, command: 'uname -a' })
    // The seven gap fields, filled at the seam rather than reaching a page
    // undefined. severity is the honest one: the wire classifies none.
    expect(out.rows[0]).toMatchObject({ type: 'command.input', severity: 'info', srcPort: 0, eventName: 'cowrie.command.input', techniques: [], city: '' })
    expect(out.rows[0].organization).toBeUndefined()
  })

  it('classifies the kind off the sensor own event name, and an IDS alert off the signature', async () => {
    const kinds: Record<string, string> = {
      'cowrie.login.failed': 'login.failed',
      'cowrie.login.success': 'login.success',
      'cowrie.command.input': 'command.input',
      'cowrie.file.download': 'file.download',
      connect: 'connection',
    }
    for (const [eventid, type] of Object.entries(kinds)) {
      stub({ '/api/v1/events': { ...page, rows: [{ ...row, record: { honeypot: { eventid } } }] }, '/api/v1/filter-values': values })
      const out = await live('getEvents')({})
      expect(out.rows[0].type, eventid).toBe(type)
    }
    stub({ '/api/v1/events': { ...page, rows: [{ ...row, pivots: { ...pivots, alert: 'ET SCAN Nmap' } }] }, '/api/v1/filter-values': values })
    expect((await live('getEvents')({})).rows[0].type).toBe('ids.alert')
    // An unrecognised sensor event falls to the page own catch-all rather
    // than to a kind the page does not have.
    stub({ '/api/v1/events': { ...page, rows: [{ ...row, record: { honeypot: { event: 'icmp_echo_reply' } } }] }, '/api/v1/filter-values': values })
    expect((await live('getEvents')({})).rows[0].type).toBe('protocol.request')
  })

  it('maps the detail endpoint onto its own fields, without inventing the row it does not serve', async () => {
    stub({ '/api/v1/event/': eventPageWire })
    const out = await live('getEventDetail')('ev_9f2c1a')
    expect(out).toMatchObject({ hashes: ['d41d8cd98f00b204e9800998ecf8427e'], recordingShasum: undefined })
    expect(out!.event).toMatchObject({ id: 'ev_9f2c1a', sensor: 'cowrie', srcIp: '203.0.113.42', summary: '', dstPort: 0 })
    expect(out!.reading).toMatchObject({ what: expect.any(String) })
    // The relation lists stay empty: the wire rows are four-field samples.
    expect([out!.session, out!.connection, out!.source]).toEqual([[], [], []])
  })

  it('maps the session bundle, dropping the sequences the page has no field for', async () => {
    stub({ '/api/v1/sessions/': sessionWire })
    const out = await live('getSessionDetail')('sess-77a1')
    expect(out).toMatchObject({ id: 'sess-77a1', srcIp: '203.0.113.42', country: 'NL' })
    expect(out!.sensors).toEqual([{ id: 'cowrie', label: 'cowrie', count: 1 }])
    expect(out!.events[0]).toMatchObject({ severity: 'info', eventName: 'cowrie.command.input' })
  })

  it('maps the recordings list and the replay, filtered to the one shasum', async () => {
    stub({ '/api/v1/recordings/': replayWire, '/api/v1/recordings': recordingPage })
    const out = await live('getReplayDetail')('ab12cd34')
    expect(out).toMatchObject({ replay: { shasum: 'ab12cd34', frames: 118 }, sessions: [{ shasum: 'ab12cd34' }], attacker: null })
  })

  it('maps the grouped search, keeping the overflow link', async () => {
    stub({ '/api/v1/search': searchWire })
    expect(await live('searchAll')('uname')).toEqual([
      { id: 'commands', title: 'Commands', total: 1, items: [{ label: 'uname -a', detail: '12', href: '/events?cmd=uname%20-a' }], moreHref: '/history?q=uname' },
    ])
  })

  it('answers an empty history query without a call, and an empty search envelope with no groups', async () => {
    const calls = stub({ '/api/v1/search': { query: 'x', redirect: null, groups: [], total: 0 } })
    expect(await live('searchAll')('   ')).toEqual([])
    expect(calls).toHaveLength(0)
    expect(await live('searchAll')('x')).toEqual([])
  })

  it('treats a 404 as the page own not-found, not as a failure', async () => {
    // The shasum 404s the replay AND leaves the companion recordings list to
    // succeed — the recordings list has no 404 to give.
    stub({
      '/api/v1/event/': fail(404, 'no such event'),
      '/api/v1/sessions/': fail(404, 'no such session'),
      '/api/v1/recordings/': fail(404, ''),
      '/api/v1/recordings': recordingPage,
    })
    expect(await live('getEventDetail')('nope')).toBeNull()
    expect(await live('getSessionDetail')('nope')).toBeNull()
    expect(await live('getReplayDetail')('nope')).toBeNull()
  })
})

describe('a degraded body degrades, and a failed call errors', () => {
  it('maps an empty-but-valid envelope to an empty list, which is what it means', async () => {
    stub({ '/api/v1/events': { total: 0, offset: 0, rows: [], fingerprint_ips: null }, '/api/v1/filter-values': { sensors: [], countries: [], cities: [], protos: [], ports: [], kinds: [] } })
    expect(await live('getEvents')({})).toMatchObject({ total: 0, rows: [], values: { sensors: [], ports: [] } })
    stub({ '/api/v1/sessions/': { ...sessionWire, events: [], sensors: [], commands: [], credentials: [], payloads: [] } })
    expect((await live('getSessionDetail')('sess-77a1'))!.events).toEqual([])
    stub({ '/api/v1/recordings': { total: 0, rows: [] } })
    expect(await live('getRecordings')()).toEqual([])
  })

  it('maps a 502 to the state the unavailable scenario already produces', async () => {
    // Every endpoint family, with the companion calls stubbed so the 502
    // under test is the one that reaches the page.
    const cases: Array<[string, () => Promise<unknown>, Record<string, unknown>]> = [
      ['getEvents', () => live('getEvents')({}), { '/api/v1/events': fail(502), '/api/v1/filter-values': fail(502) }],
      ['getEvents (rows)', () => live('getEvents')({}), { '/api/v1/events': fail(502), '/api/v1/filter-values': values }],
      ['getCommands', () => live('getCommands')({}), { '/api/v1/events': fail(502) }],
      ['searchHistory', () => liveQuery('searchHistory', undefined)!('uname', {}), { '/api/v1/events': fail(502) }],
      ['searchAll', () => live('searchAll')('uname'), { '/api/v1/search': fail(502) }],
      ['getSessionDetail', () => live('getSessionDetail')('s'), { '/api/v1/sessions/': fail(502) }],
      ['getEventDetail', () => live('getEventDetail')('e'), { '/api/v1/event/': fail(502) }],
      ['getRecordings', () => live('getRecordings')(), { '/api/v1/recordings': fail(502) }],
      ['getReplayDetail', () => live('getReplayDetail')('s'), { '/api/v1/recordings': fail(502) }],
    ]
    for (const [name, call, fixtures] of cases) {
      stub(fixtures)
      await expect(call(), name).rejects.toThrow(ApiError)
    }
  })

  // The regression this whole slice could introduce: a fetch that fails must
  // reach the page as an error state. An events list with no rows reads as
  // "no activity", and an operator cannot tell that from a backend that is
  // down — so every failure below asserts a throw, never an empty list.
  it('throws rather than returning an empty list when the backend is down', async () => {
    stub({
      '/api/v1/events': () => {
        throw new TypeError('fetch failed')
      },
    })
    const out = await live('getEvents')({}).catch((error: unknown) => error)
    expect(out).toBeInstanceOf(ApiError)
    expect((out as ApiError).kind).toBe('unavailable')
    expect((out as ApiError).status).toBe(502)
  })

  it('throws rather than returning null when the detail call cannot connect', async () => {
    stub({
      '/api/v1/event/': () => {
        throw new TypeError('fetch failed')
      },
    })
    const out = await live('getEventDetail')('ev_9f2c1a').catch((error: unknown) => error)
    expect(out).toBeInstanceOf(ApiError)
    // Not the null a 404 would produce — an error state, so the page shows
    // its failure and not "no such event".
    expect(out).not.toBeNull()
  })

  it('treats a bad service token as unavailable, not as an expired session', async () => {
    // The tier's 401 means OUR shared secret is wrong — a deployment fault.
    // Mapping it onto `expired` would drive every operator through sign-in
    // again for something only a deployment fix cures.
    stub({ '/api/v1/events': fail(401, 'service token required'), '/api/v1/filter-values': values })
    const error = (await live('getEvents')({}).then(() => null, (e: unknown) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.kind).toBe('unavailable')
    expect(error.status).toBe(502)
    expect(error.message).not.toContain('test-token')
    expect(error.detail).toBe('service token required')
  })

  it('maps each refusal to the kind the pages already tell apart', async () => {
    for (const [status, kind, retryAfter] of [
      [400, 'invalid', undefined],
      [403, 'forbidden', undefined],
      [401, 'unavailable', undefined],
      [503, 'overloaded', 30],
      [504, 'unavailable', undefined],
    ] as const) {
      stub({ '/api/v1/events': fail(status, 'refused', retryAfter ? { 'retry-after': String(retryAfter) } : {}), '/api/v1/filter-values': values })
      const error = (await live('getEvents')({}).then(() => null, (e: unknown) => e)) as ApiError
      expect(error.kind, String(status)).toBe(kind)
      if (retryAfter) expect(error.retryAfter).toBe(retryAfter)
    }
  })
})

// ---- the Evidence & analysis slice (#78) -------------------------------------

describe('the mounted base', () => {
  it('routes a spool route to BACKEND_MOUNTED_URL, never the regular base', async () => {
    process.env.BACKEND_MOUNTED_URL = 'http://mounted.test'
    const calls = stub({ '/api/v1/sandbox/sbx-1': { sandbox: { job: 'sbx-1', sha256: 'a'.repeat(64), completed_at: '', exit_status: 'ok', run_status: 'ok', duration_seconds: 1, risk_score: 10, platform: 'linux-x86_64' }, _doc_id: 'sbx:1' } })
    await live('getSandboxRun')('sbx-1')
    expect(calls[0]).toMatch(/^http:\/\/mounted\.test\/api\/v1\/sandbox\//)
    // A sandbox answer off the REGULAR instance comes back empty rather than
    // erroring, which is the whole hazard this routing exists to prevent.
    expect(calls[0]).not.toContain('backend.test')
  })

  it('falls back to BACKEND_URL when the mounted base is unset', async () => {
    delete process.env.BACKEND_MOUNTED_URL
    const calls = stub({ '/api/v1/ghidra/': { ghidra: { sha256: 'b'.repeat(64), requested_at: '', started_at: '', completed_at: '', exit_status: 'ok', functions: [] } } })
    await live('getGhidraAnalysis')('b'.repeat(64))
    expect(calls[0]).toMatch(/^http:\/\/backend\.test\/api\/v1\/ghidra\//)
  })
})

describe('the actor the Rust tier trusts', () => {
  const admin = { name: 'alice', email: 'a@example.test', roles: ['admin'] }

  it('forwards the session user on a mounted mutation, never client input', async () => {
    const calls = stub({ '/api/v1/gpu-queue/gj-1/abort': { ok: true, job_id: 'gj-1', abort_requested: true } })
    expect(await liveQuery('abortGpuJob', admin)!('gj-1')).toBe(true)
    const init = vi.mocked(fetch).mock.calls.at(-1)?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['x-actor-username']).toBe('alice')
    expect(headers['x-actor-role']).toBe('admin')
    // The token rides as a header and never in the URL.
    expect(headers['x-service-token']).toBe('test-token')
    expect(calls[0]).not.toContain('test-token')
  })

  it('sends no actor headers when there is no signed-in user', async () => {
    stub({ '/api/v1/gpu-queue/gj-1/abort': { ok: true, job_id: 'gj-1', abort_requested: true } })
    await liveQuery('abortGpuJob', undefined)!('gj-1')
    const init = vi.mocked(fetch).mock.calls.at(-1)?.[1] as RequestInit
    expect((init.headers as Record<string, string>)['x-actor-username']).toBeUndefined()
  })

  it('refuses a viewer the same way the mock refuses them, before any fetch', async () => {
    stub({ '/api/v1/gpu-queue/gj-1/abort': { ok: true, job_id: 'gj-1', abort_requested: true } })
    await expect(liveQuery('abortGpuJob', { name: 'V', email: 'v@example.test', roles: ['viewer'] })!('gj-1')).rejects.toThrow(ApiError)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('the Evidence queries against a fixture per endpoint', () => {
  it('maps GET /payloads, sources rollup included', async () => {
    const calls = stub({ '/api/v1/payloads': { total: 1, rows: [{ _doc_id: 'd1', sha256: 'c'.repeat(64), size_bytes: 12, kind: 'PE32', first_seen: '', last_seen: '', sources: ['cowrie'], tags: [] }], source_buckets: [{ key: 'cowrie', doc_count: 1 }] } })
    expect(await live('getPayloads')()).toMatchObject({ sources: [{ id: 'cowrie', label: 'cowrie', count: 1 }] })
    expect(calls[0]).toContain('offset=0')
    // Without aggs=sources the backend answers 200 and simply omits the
    // census, so the rollup would be empty for no visible reason.
    expect(calls[0]).toContain('aggs=sources')
  })

  it('maps GET /payloads/{hash}, a 404 being the page null', async () => {
    stub({ '/api/v1/payloads/deadbeef': fail(404, 'not found') })
    expect(await live('getPayloadAnalysis')('deadbeef')).toBeNull()
  })

  it('maps GET /sandbox/{job} and the double-nested GET /revdeck/{sha}', async () => {
    stub({
      '/api/v1/sandbox/sbx-9': { sandbox: { job: 'sbx-9', sha256: 'd'.repeat(64), completed_at: '2026-10-01T09:00:00Z', exit_status: 'ok', run_status: 'ok', duration_seconds: 5, risk_score: 80, platform: 'windows-kvm', iocs: [] }, _doc_id: 'sbx:9' },
      '/api/v1/revdeck/': { revdeck: { sha256: 'e'.repeat(64), revdeck: { workflow: 'revdeck-v1', status: 'complete', answer: 'It beaconed.', steps: [], citations: { valid: ['a'], invalid: [] } } } },
    })
    expect(await live('getSandboxRun')('sbx-9')).toMatchObject({ job: 'sbx-9', verdict: 'malicious', route: { name: 'windows-kvm' } })
    expect(await live('getRevDeckRun')('e'.repeat(64))).toMatchObject({ sha: 'e'.repeat(64), status: 'completed', summary: 'It beaconed.' })
  })

  it('reads a VNC 404 as "not running", which is what it means', async () => {
    stub({ '/api/v1/sandbox/vnc': fail(404, 'no Windows-sandbox detonation is currently running') })
    expect(await live('getSandboxLiveStatus')()).toEqual({ running: false })
  })

  it('maps the store pages for CAPE, GitHub and RevDeck', async () => {
    stub({
      '/api/v1/store/cape': { total: 0, rows: [] },
      '/api/v1/store/github-analysis': { total: 1, rows: [{ _doc_id: 'g1', github_analysis: { sha256: 'f'.repeat(64), requested_at: '', started_at: '', completed_at: '2026-10-01T12:00:00Z', exit_status: 'ok', commit: 'abc', scanners: [] } }] },
      '/api/v1/store/revdeck': { total: 1, rows: [{ _doc_id: 'r1', sha256: '9'.repeat(64), revdeck: { workflow: 'revdeck-v1', status: 'complete', answer: 'yes', steps: [], citations: { valid: [], invalid: [] } } }] },
    })
    expect(await live('getCapeRuns')()).toEqual([])
    const gh = await live('getGithubAnalyses')()
    expect(gh[0]).toMatchObject({ sha: 'f'.repeat(64), status: 'dry_run', requestedBy: 'unknown' })
    expect((await live('getRevDeckRuns')())[0]).toMatchObject({ sha: '9'.repeat(64) })
  })

  it('maps GET /artifacts/{kind}/{key}, a 404 being the page null', async () => {
    stub({ '/api/v1/artifacts/ghidra/abc': { rows: [{ filename: 'main.c', kind: 'ghidra', content_type: 'text/plain', size_bytes: 12, imported_at: '2026-10-01T00:00:00Z' }] } })
    expect(await live('getArtifacts')('ghidra', 'abc')).toEqual([{ filename: 'main.c', kind: 'ghidra', contentType: 'text/plain', sizeBytes: 12, importedAt: '2026-10-01T00:00:00Z' }])
    stub({ '/api/v1/artifacts/ghidra/none': fail(404, 'not found') })
    expect(await live('getArtifacts')('ghidra', 'none')).toBeNull()
  })

  it('reads the artifact route as bytes, its content-type off the header', async () => {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url)
        if (url.includes('/none/')) return new Response('no such artifact', { status: 404 })
        // The route answers the reassembled body directly, not a JSON
        // envelope — parsing it as JSON would be the bug this test pins.
        return new Response(new Uint8Array([0x4d, 0x5a]), { status: 200, headers: { 'content-type': 'application/x-dosexec' } })
      }),
    )
    expect(await live('getArtifactFile')('ghidra', 'abc', 'sample.exe')).toMatchObject({ filename: 'sample.exe', kind: 'ghidra', contentType: 'application/x-dosexec' })
    // One request, not a metadata lookup followed by a download.
    expect(calls).toHaveLength(1)
    expect(await live('getArtifactFile')('ghidra', 'none', 'gone.exe')).toBeNull()
  })

  it('never renders a failed Evidence fetch as an empty list', async () => {
    stub({ '/api/v1/store/cape': fail(502, 'elasticsearch refused') })
    const error = (await live('getCapeRuns')().then(() => null, (e: unknown) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.kind).toBe('unavailable')
  })
})

describe('getAnalysisResults, a composite with no results endpoint of its own', () => {
  const admin = { name: 'alice', email: 'a@example.test', roles: ['admin'] }
  const empty = { total: 0, rows: [] }

  it('fans out to the five endpoints that do exist', async () => {
    const calls = stub({
      '/api/v1/gpu-queue': [{ job_id: 'gj-1', job_type: 'decompile', ref: 'a'.repeat(64), model: 'qwen', estimated_vram_mib: 18_000, status: 'running', requested_at: '2026-10-01T14:00:00Z', started_at: '', finished_at: '', abort_requested: false, error: '', attempts: 1, result: null }],
      '/api/v1/workbench/analyzers': [{ classification: { code: 'c', label: 'Executable', platform: 'PE', category: 'executable', analysis_path: 'x', dynamic: false }, analyzers: [] }],
      '/api/v1/workbench/runs': { runs: [] },
      '/api/v1/workbench/recipes': { recipes: [] },
      '/api/v1/store/yara': empty,
    })
    const data = (await liveQuery('getAnalysisResults', admin)!()) as Awaited<ReturnType<Backend['getAnalysisResults']>>
    expect(data.gpuQueue[0]).toMatchObject({ jobId: 'gj-1', status: 'running', vramMib: 18_000 })
    expect(data.results[0]).toMatchObject({ id: 'gj-1', analyzer: 'workbench' })
    // #3110: identity is the actor header alone. An `owner` query param here
    // would read as if it scoped the list, and it is not deserialized at all.
    expect(calls.some((url) => url.includes('owner='))).toBe(false)
    expect(calls.filter((url) => url.includes('/api/v1/workbench/'))).toHaveLength(3)
  })

  it('routes the workbench half to the mounted base', async () => {
    process.env.BACKEND_MOUNTED_URL = 'http://mounted.test'
    const calls = stub({ '/api/v1/gpu-queue': [], '/api/v1/workbench/analyzers': [], '/api/v1/workbench/runs': { runs: [] }, '/api/v1/workbench/recipes': { recipes: [] }, '/api/v1/store/yara': { total: 0, rows: [] } })
    await liveQuery('getAnalysisResults', admin)!()
    const workbench = calls.filter((url) => url.includes('/api/v1/workbench/'))
    expect(workbench).toHaveLength(3)
    expect(workbench.every((url) => new URL(url).origin === 'http://mounted.test')).toBe(true)
  })
})

describe('the mutations', () => {
  const admin = { name: 'alice', email: 'a@example.test', roles: ['admin'] }

  it('POSTs the workbench run body to the mounted base', async () => {
    process.env.BACKEND_MOUNTED_URL = 'http://mounted.test'
    const calls = stub({ '/api/v1/workbench/runs': { run: { id: 'wr-1', payload_sha256: 'a'.repeat(64), payload_kind: 'PE32', owner: 'alice', state: 'queued', created_at: '', updated_at: '', children: [] }, reused: false } })
    const run = await liveQuery('startAnalysisRun', admin)!({ hash: 'a'.repeat(64), analyzers: ['static'], static: { minStringLength: 4 } })
    expect(run).toMatchObject({ reused: false, run: { id: 'wr-1', hash: 'a'.repeat(64) } })
    expect(calls[0]).toMatch(/^http:\/\/mounted\.test\/api\/v1\/workbench\/runs$/)
    const body = JSON.parse((vi.mocked(fetch).mock.calls.at(-1)?.[1] as RequestInit).body as string)
    // The page's 'static' analyzer id goes out as the workbench's own name.
    expect(body.analyzers[0].analyzer_id).toBe('deterministic')
  })

  it('POSTs a child action and reports what the abort route said', async () => {
    const calls = stub({ '/api/v1/workbench/runs/wr-1/children/ghidra/retry': { run: { id: 'wr-1', payload_sha256: 'a'.repeat(64), payload_kind: 'PE32', owner: 'alice', state: 'queued', created_at: '', updated_at: '', children: [] } }, '/api/v1/gpu-queue/gj-1/abort': { ok: true, job_id: 'gj-1', abort_requested: true } })
    expect(await liveQuery('setRunChild', admin)!('wr-1', 'ghidra', 'retry')).toMatchObject({ id: 'wr-1' })
    expect(await liveQuery('abortGpuJob', admin)!('gj-1')).toBe(true)
    expect(calls[0]).toContain('/children/ghidra/retry')
    expect(calls[1]).toContain('/gpu-queue/gj-1/abort')
  })

  it('reports a refused abort as false rather than throwing it away', async () => {
    stub({ '/api/v1/gpu-queue/gj-2/abort': { ok: true, job_id: 'gj-2', abort_requested: false } })
    expect(await liveQuery('abortGpuJob', admin)!('gj-2')).toBe(false)
  })

  it('submits each payload action to its own spool route', async () => {
    const calls = stub({ '/api/v1/sandbox/submit': { queued: true }, '/api/v1/ghidra/submit': { queued: true }, '/api/v1/github-analysis/submit': { queued: true } })
    expect(await liveQuery('queuePayloadAction', admin)!('a'.repeat(64), 'sandbox')).toBe('Sandbox detonation queued')
    expect(await liveQuery('queuePayloadAction', admin)!('a'.repeat(64), 'ghidra')).toMatch(/GPU queue/)
    await liveQuery('queuePayloadAction', admin)!('a'.repeat(64), 'github')
    expect(calls[2]).toContain('/github-analysis/submit')
    // The body field is `hash`, not `sha256`, on all three submit routes.
    for (const call of vi.mocked(fetch).mock.calls.slice(-3)) expect(JSON.parse((call[1] as RequestInit).body as string).hash).toBe('a'.repeat(64))
    // `confirm` is the backend's own required literal, not an assumption.
    expect(JSON.parse((vi.mocked(fetch).mock.calls.at(-1)?.[1] as RequestInit).body as string).confirm).toBe('publish')
  })
})

// ---- the settings slice -------------------------------------------------------

const configWire = { revision: 14, payload: { presentation: { app_name: 'APIARY' }, behavior: { default_time_window: '24h', read_only: false }, honeypot: { alert_cooldown: '15m' } } }
const storageWire = { cluster_status: 'green', index_count: 42, doc_count: 1_000, store_bytes: 2_048 }
const servicesWire = { available: true, services: [{ name: 'hp-tanner', state: 'running', exit_code: null, started_at: '2026-10-04T08:00:00Z', restart_count: 0 }] }
const reportInput = { page: '/settings', expected: 'x', actual: 'y', actionTrail: [], consoleErrors: [], networkFailures: [], apiCalls: [], domSnapshot: '', userAgent: 'UA' }

/** Every document `getSettings` reads, so one fan-out test does not hand-build
 * eight fixtures; the ones under test override their own path. */
const settingsFixtures = (over: Record<string, unknown> = {}) => ({
  '/api/v1/config': configWire,
  '/api/v1/config/history': { entries: [{ revision: 41, time: '2026-10-04T08:00:00Z', actor_subject: 'oidc|1', actor_username: 'operator', action: 'update', fields: ['behavior'] }] },
  '/api/v1/users': { users: [{ subject: 'oidc|1', username: 'operator', role: 'admin', first_seen_at: '2026-06-01T00:00:00Z', last_seen_at: '2026-10-04T08:00:00Z' }] },
  '/api/v1/audit': { events: [{ actor_subject: 'oidc|1', actor_username: 'operator', action: 'config.update', fields: ['behavior'], revision: 41, result: 'success' }] },
  '/api/v1/services': servicesWire,
  '/api/v1/reporter-stats': { available: false, reason: 'no reporter metrics indexed yet' },
  '/api/v1/settings/storage': storageWire,
  '/api/v1/reports/templates': { templates: [{ id: 'executive', name: 'Executive', description: 'One-page brief' }], elements: [] },
  ...over,
})

describe('the settings page, fanned out over its eight documents', () => {
  it('reads the wire ones and leaves preferences at the backend default', async () => {
    const calls = stub(settingsFixtures())
    const out = await live('getSettings')()
    expect(out.config.revision).toBe(14)
    expect(out.config.presentation.appName).toBe('APIARY')
    expect(out.users[0]).toMatchObject({ subject: 'oidc|1', username: 'operator' })
    expect(out.history[0]).toMatchObject({ id: '41', actor: 'operator' })
    expect(out.services[0]).toMatchObject({ name: 'hp-tanner', state: 'running' })
    expect(out.storage).toMatchObject({ clusterStatus: 'green', indexCount: 42 })
    expect(out.reportTemplates).toHaveLength(1)
    // NOT the wire's per-subject document — that GET is the public-query trap
    // and is not wired. The backend's own default_preferences render instead.
    expect(out.preferences).toMatchObject({ theme: 'system', rowsPerPage: 50, notifyCanary: false })
    // The preferences endpoint is never called from a signed-in page either.
    expect(calls.some((url) => url.includes('/api/v1/preferences'))).toBe(false)
  })

  it('fails the whole read when one leg fails, rather than building a panel of defaults', async () => {
    // A `revision: 0` fallback would be a real baseline every later save then
    // conflicts against, blaming an editor who never existed.
    stub(settingsFixtures({ '/api/v1/users': fail(502, 'store down') }))
    await expect(live('getSettings')()).rejects.toThrow(ApiError)
  })

  it('renders a never-written config document as the shell reads it', async () => {
    stub(settingsFixtures({ '/api/v1/config': { revision: 0, payload: {} } }))
    const out = await live('getSettings')()
    expect(out.config.revision).toBe(0)
    expect(out.config.presentation.appName).toBe('')
    expect(out.config.behavior.readOnly).toBe(false)
  })
})

describe('the shell config', () => {
  it('reads the config document, and takes links from the deployment environment', async () => {
    // `links` has no endpoint — canonical builds them from its own process
    // env, so this tier does too rather than inventing a source.
    stub({ '/api/v1/config': configWire })
    process.env.HONEYPOT_DOMAIN = 'hp.example.test'
    process.env.KIBANA_PUBLIC_URL = 'https://kibana.other.test/'
    const out = await live('getShellConfig')()
    expect(out.presentation.appName).toBe('APIARY')
    expect(out.links).toEqual({ kibana: 'https://kibana.other.test/', evebox: 'https://evebox.hp.example.test', arkime: 'https://arkime.hp.example.test' })
    // accountConsole is derived from the OIDC issuer, which this tier does
    // not configure: an absent link is a missing button, never a wrong one.
    expect(out.links.accountConsole).toBeUndefined()
    delete process.env.HONEYPOT_DOMAIN
    delete process.env.KIBANA_PUBLIC_URL
  })

  it('leaves an unconfigured tool out rather than guessing at a URL', async () => {
    stub({ '/api/v1/config': configWire })
    const out = await live('getShellConfig')()
    expect(out.links).toEqual({})
  })
})

describe('the config writes', () => {
  it('validates a section on its own, against the endpoint that persists nothing', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ ok: false, problems: ['behavior.default_time_window is not a window', 'unknown config section "mystery"'] }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    // A refusal is a 200 carrying problems — a result, not an error.
    expect(await live('validateConfig')('behavior', { defaultTimeWindow: 'nope' } as never)).toEqual({
      'behavior.default_time_window': 'is not a window',
      'unknown config section "mystery"': 'unknown config section "mystery"',
    })
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body).toEqual({ behavior: expect.objectContaining({ default_time_window: 'nope' }) })
  })

  it('saves a whole section to the route its own name has', async () => {
    const calls = stub({ '/api/v1/config/behavior': { ...configWire, revision: 15 } })
    const out = await live('saveConfigSection')('behavior', { defaultTimeWindow: '7d', rowsPerPageOptions: [50], readOnly: false } as never)
    expect(new URL(calls[0]).pathname).toBe('/api/v1/config/behavior')
    const body = JSON.parse(String(vi.mocked(globalThis.fetch).mock.calls[0][1]?.body))
    // The handler REPLACES its block, so every field the page holds must
    // ride — a partial body would drop what it omits. Only what the page
    // carries is sent; a field absent from the page type is absent from the
    // document too, because the page owns the section.
    expect(body).toMatchObject({ default_time_window: '7d', read_only: false, rows_per_page_options: [50] })
    expect(body).not.toHaveProperty('revision')
    expect(out).toEqual({ ok: true, revision: 15 })
  })

  it('sends presentation to its own route, not to the section that 404s', async () => {
    const calls = stub({ '/api/v1/config/presentation': configWire })
    await live('saveConfigSection')('presentation', { appName: 'APIARY', titleFormat: '{ip}' } as never)
    expect(new URL(calls[0]).pathname).toBe('/api/v1/config/presentation')
  })

  it('rolls back by integer revision, and refuses an id that is not one', async () => {
    const calls = stub({ '/api/v1/config/rollback': configWire })
    await live('rollbackConfig')('41')
    const body = JSON.parse(String(vi.mocked(globalThis.fetch).mock.calls[0][1]?.body))
    expect(body).toMatchObject({ revision: 41 })
    // The page's id is that same integer rendered, so `rev-41` parses too —
    // the adapter strips the prefix rather than sending a string revision
    // the backend would reject as negative.
    await live('rollbackConfig')('rev-41')
    expect(JSON.parse(String(vi.mocked(globalThis.fetch).mock.calls[1][1]?.body))).toMatchObject({ revision: 41 })
    // Anything that is not a revision is refused here, before the call.
    await expect(live('rollbackConfig')('rev-x')).rejects.toThrow(ApiError)
    expect(calls).toHaveLength(2)
  })
})

describe('read-only mode, which the Rust tier does not enforce', () => {
  it('refuses a write with the same 423 the mock gives', async () => {
    // Nothing in the backend implements read_only — it is a dashboard
    // preference. Without this the guard would exist for the mock tier only:
    // passing its tests and absent in production.
    stub({ '/api/v1/config': { ...configWire, payload: { behavior: { read_only: true } } } })
    const error = (await live('setProblemStatus')('pr-1', 'triaged').then(() => null, (e: unknown) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.kind).toBe('locked')
    // One config read, and the guarded write never leaves.
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1)

    // A container restart is guarded too — nothing exempts it, exactly as
    // the mock treats it. The two exemptions are the writes that turn
    // read-only off, which is why they need the flag readable at all.
    stub({ '/api/v1/config': { ...configWire, payload: { behavior: { read_only: true } } }, '/api/v1/services/hp-tanner/restart': { ok: true } })
    await expect(live('runServiceAction')('hp-tanner', 'restart')).rejects.toThrow(ApiError)
  })

  it('still allows turning it off, and ones own preferences and reports', async () => {
    stub({ '/api/v1/config': { ...configWire, payload: { behavior: { read_only: true } } }, '/api/v1/config/rollback': configWire, '/api/v1/problem-reports': { id: 'pr-1' } })
    await expect(live('rollbackConfig')('41')).resolves.toBeUndefined()
    expect(await live('submitProblemReport')(reportInput)).toEqual({ id: 'pr-1' })
  })
})

describe('services, mail and problem reports', () => {
  it('asks the services adapter for the action and reports its own refusal', async () => {
    const calls = stub({ '/api/v1/config': configWire, '/api/v1/services/hp-tanner/restart': { ok: true, name: 'hp-tanner', action: 'restart' } })
    await expect(live('runServiceAction')('hp-tanner', 'restart')).resolves.toBeUndefined()
    expect(new URL(calls[calls.length - 1]).pathname).toBe('/api/v1/services/hp-tanner/restart')
    // The handler answers 200 with an ack that can be a refusal; it is not an
    // HTTP error, so it would otherwise reach the page as a success.
    stub({ '/api/v1/config': configWire, '/api/v1/services/hp-tanner/restart': { ok: false, error: 'adapter unreachable' } })
    await expect(live('runServiceAction')('hp-tanner', 'restart')).rejects.toThrow(ApiError)
  })

  it('answers a mail session that captured nothing with null, not an error', async () => {
    stub({ '/api/v1/mail/': fail(404, 'no capture') })
    expect(await live('getMail')('sess-none')).toBeNull()
  })

  it('lists problem reports from the store passthrough, the only endpoint that serves them', async () => {
    // The Rust tier serves only the POST and the PATCH under
    // /api/v1/problem-reports — no GET — so the list comes from the
    // allowlisted generic store, exactly as canonical's page reads it.
    const calls = stub({ '/api/v1/store/problem-reports': { total: 1, rows: [{ id: 'pr-1', submitted_at: '2026-10-04T08:00:00Z', submitted_by: 'oidc|1', page: '/settings', expected: 'x', actual: 'y', action_trail: [], console_errors: [], network_failures: [], api_calls: [], user_agent: 'UA', status: 'open' }] } })
    const out = await live('getProblemReports')()
    expect(Object.fromEntries(new URL(calls[0]).searchParams)).toEqual({ offset: '0', size: '100' })
    expect(out[0]).toMatchObject({ id: 'pr-1', status: 'open' })
  })

  it('folds a status the store cannot hold into one it can', async () => {
    const calls = stub({ '/api/v1/config': configWire, '/api/v1/problem-reports/pr-1': null })
    await live('setProblemStatus')('pr-1', 'fixed')
    expect(JSON.parse(String(vi.mocked(globalThis.fetch).mock.calls[1][1]?.body))).toEqual({ status: 'closed' })
    expect(new URL(calls[calls.length - 1]).pathname).toBe('/api/v1/problem-reports/pr-1')
  })

  it('attributes every write to the session subject, never to a blank actor', async () => {
    // The Rust tier has no session concept: each actor-attributed write takes
    // `actor_subject`/`actor_username` and writes them into the audit log
    // verbatim. `SessionUser` carries no subject, so the seam reads the
    // session record. With no session resolvable the fields are omitted
    // rather than sent empty — `request` drops empty params, so the backend
    // applies its own `#[serde(default)]` and the row is its own doing.
    // Inventing a subject, or passing "unknown", would put a name in a log
    // that reads as a real editor; this asserts it neither happens.
    const calls = stub({ '/api/v1/config': configWire, '/api/v1/config/behavior': configWire })
    await live('saveConfigSection')('behavior', {} as never)
    const url = new URL(calls[calls.length - 1])
    expect(url.pathname).toBe('/api/v1/config/behavior')
    expect(url.searchParams.has('actor_subject')).toBe(false)
    expect(url.searchParams.has('actor_username')).toBe(false)
  })

})

describe('the settings slice fails as an error, never as an empty panel', () => {
  it('maps a 502 on each endpoint to the state the unavailable scenario produces', async () => {
    const cases: Array<[string, () => Promise<unknown>, Record<string, unknown>]> = [
      ['getSettings', () => live('getSettings')(), settingsFixtures({ '/api/v1/audit': fail(502) })],
      ['getSettings (services)', () => live('getSettings')(), settingsFixtures({ '/api/v1/services': fail(503, 'adapter unconfigured') })],
      ['getShellConfig', () => live('getShellConfig')(), { '/api/v1/config': fail(502) }],
      ['validateConfig', () => live('validateConfig')('behavior', {} as never), { '/api/v1/config/validate': fail(502) }],
      ['saveConfigSection', () => live('saveConfigSection')('honeypot', {} as never), { '/api/v1/config': configWire, '/api/v1/config/honeypot': fail(502) }],
      ['rollbackConfig', () => live('rollbackConfig')('41'), { '/api/v1/config': configWire, '/api/v1/config/rollback': fail(502) }],
      ['runServiceAction', () => live('runServiceAction')('hp-tanner', 'restart'), { '/api/v1/config': configWire, '/api/v1/services/hp-tanner/restart': fail(502) }],
      ['getMail', () => live('getMail')('sess-1'), { '/api/v1/mail/': fail(502) }],
      ['getProblemReports', () => live('getProblemReports')(), { '/api/v1/store/problem-reports': fail(502) }],
      ['submitProblemReport', () => live('submitProblemReport')(reportInput), { '/api/v1/config': configWire, '/api/v1/problem-reports': fail(502) }],
      ['setProblemStatus', () => live('setProblemStatus')('pr-1', 'triaged'), { '/api/v1/config': configWire, '/api/v1/problem-reports/pr-1': fail(502) }],
    ]
    for (const [name, call, fixtures] of cases) {
      stub(fixtures)
      await expect(call(), name).rejects.toThrow(ApiError)
    }
  })
})
// ---- Operations (#77) ------------------------------------------------------

/** One alert-state document as worker.rs `Notifier::observe` writes it: the
 * eight fields and nothing else — no severity, no acknowledger. */
const alertDoc = (key: string, acknowledged = false) => ({
  Key: key,
  Message: `yara matched on ${key}`,
  Link: '/events?q=uname',
  FirstSeen: '2026-10-04T08:00:00Z',
  LastSeen: '2026-10-04T20:41:03Z',
  LastNotified: null,
  Count: 12,
  Acknowledged: acknowledged,
  _doc_id: key,
})

const alertPageWire = { total: 3, rows: [alertDoc('yara:abc123'), alertDoc('pipeline:dead-letters', true), alertDoc('stale:cowrie')] }

const healthWire = {
  cluster_status: 'green', total_documents: 12_345,
  sensors: [{ sensor: 'cowrie', documents: 900, last_seen: '2026-10-04T20:41:03Z', state: 'ACTIVE' }],
  yara: { enabled: true, last_scan: '2026-10-04T03:00:00Z', rules_sha256: 'ff', samples: 40, matched: 2, errors: 0 },
  runtime: { uptime_seconds: 7200, rss_bytes: 1_048_576, vm_bytes: 2_097_152 },
  ingest: { state: 'healthy', last_ingest: '2026-10-04T20:41:03Z', age_seconds: 12, recent_dead_letters: 3 },
  dead_letters: 91,
  pipeline: { state: 'healthy', acked: 10, failed: 1, dropped: 0, active: 2, decode_failures: 0 },
  webhook: { available: false, reason: 'not configured', state: 'disabled', target: '', messages: 0, consecutive_failures: 0, failure_threshold: 5, last_success: null, last_failure: null, updated_at: '' },
  unattributed_24h: 4,
}

const topologyWire = {
  generated_at: '2026-10-04T20:41:03Z',
  sensors: [
    { sensor: 'cowrie', stack: 'honeypot-cowrie', containers: ['hp-cowrie'], ingress: ['portbridge', 'tunnel-only'], hostnames: [], ports: [{ proto: 'tcp', public: 22, host: 19022, proxy: true }], rawIndex: 'honeypot-v2' },
    { sensor: 'dionaea', stack: 'honeypot-dionaea', containers: ['hp-dionaea'], ingress: ['traefik'], hostnames: ['smtp.example.test'], ports: [], rawIndex: 'unmapped' },
  ],
  flow: { nodes: [{ name: 'VPS Traefik (:443 hostnames)', layer: 0 }, { name: 'cowrie', layer: 1 }], links: [{ source: 'VPS Traefik (:443 hostnames)', target: 'cowrie' }] },
  stacks: [{ stack: 'honeypot-cowrie', containers: [{ name: 'hp-cowrie', adapterVisible: true }] }],
}

const sensorOverviewWire = {
  sensor: 'cowrie', window: 'now-7d', events: 900, unique_sources: 40,
  first_seen: '2026-10-04T08:00:00Z', last_seen: '2026-10-04T20:41:03Z', hourly: [4, 9],
  top_sources: [{ key: '203.0.113.42', count: 7 }], top_countries: [{ key: 'NL', count: 9 }],
  top_lists: [{ label: 'commands', rows: [{ key: 'uname -a', count: 3 }] }],
  measures: [{ label: 'commands', total: 120, max: 9, unit: 'count' }],
}

const operationsFixtures = (over: Record<string, unknown> = {}) => ({
  '/api/v1/alerts': alertPageWire,
  '/api/v1/source-health': healthWire,
  '/api/v1/topology': topologyWire,
  '/api/v1/services': { available: true, services: [{ name: 'hp-cowrie', state: 'running', exit_code: null, started_at: '2026-10-04T08:00:00Z', restart_count: 0 }] },
  '/api/v1/config': configWire,
  '/api/v1/sensors/catalog': { window: 'now-14d', sensors: [{ sensor: 'cowrie', events: 900, last_seen: '2026-10-04T20:41:03Z' }] },
  '/api/v1/sensors/cowrie/overview': sensorOverviewWire,
  '/api/v1/sensors/cowrie/events': { sensor: 'cowrie', total: 1, rows: [{ id: 'ev-1', when: '2026-10-04T20:41:03Z', src_ip: '203.0.113.42', src_port: 51322, dst_port: 19022, fields: { eventid: 'cowrie.command.input', input: 'uname -a' } }] },
  '/api/v1/store/dead-letters': { total: 1, rows: [{ _doc_id: 'dl-1', '@timestamp': '2026-10-04T19:00:00Z', reason: 'mapper_parsing_exception', logset: 'nginx' }] },
  ...over,
})

describe('alerts', () => {
  it('reads the store page the issue documents, one single-member group per document', async () => {
    const calls = stub(operationsFixtures())
    const groups = await live('getAlerts')()
    expect(Object.fromEntries(new URL(calls[0]).searchParams)).toEqual({ offset: '0', size: '100' })
    expect(groups).toHaveLength(3)
    // One document per key, so nothing folds: the page's client-side
    // grouping has nothing left to merge.
    expect(groups.every((g) => g.members.length === 1)).toBe(true)
    expect(groups[0]).toMatchObject({ kind: 'yara', message: 'yara matched on yara:abc123', count: 12, acknowledged: false })
    // The key's own prefix is the only kind the document carries.
    expect(groups.map((g) => g.kind).sort()).toEqual(['pipeline', 'stale', 'yara'])
  })

  it('reads every alert as info: the document has no severity field at all', async () => {
    // Gap #2. worker.rs writes Key/Message/Link/FirstSeen/LastSeen/Count/
    // Acknowledged/LastNotified — there is no severity to read, so nothing
    // is inferred from the key. Every row, and no exception.
    stub(operationsFixtures())
    const groups = await live('getAlerts')()
    expect(groups.map((g) => g.severity)).toEqual(['info', 'info', 'info'])
    expect(groups.every((g) => g.members.every((m) => m.severity === 'info'))).toBe(true)
  })

  it('carries no acknowledger, because the document has nowhere to put one', async () => {
    // Gap #2, second half: `acknowledgedBy` has no source at all upstream.
    stub(operationsFixtures())
    const [group] = await live('getAlerts')()
    expect(group.members[0]).not.toHaveProperty('acknowledgedBy')
  })

  it('counts the open alerts from the same page, for the shell bell', async () => {
    const calls = stub(operationsFixtures())
    expect(await live('getOpenAlertCount')()).toBe(2)
    expect(new URL(calls[0]).pathname).toBe('/api/v1/alerts')
  })

  it('POSTs the ack body the handler requires, once per key', async () => {
    // `ack` has no serde default (stores.rs AckBody), so the direction rides
    // in the body — that is what makes a reopen the same call, flipped.
    const calls = stub(operationsFixtures({ '/api/v1/alerts/yara%3Aabc123/ack': { ok: true, key: 'yara:abc123', ack: true } }))
    await live('setAlertsAcknowledged')(['yara:abc123'], true)
    const call = vi.mocked(globalThis.fetch).mock.calls.at(-1)!
    expect(call[0]).toBe('http://backend.test/api/v1/alerts/yara%3Aabc123/ack')
    expect(call[1]?.method).toBe('POST')
    expect(JSON.parse(String(call[1]?.body))).toEqual({ ack: true })
    // Two calls, not one: `guardReadOnly` spends a config read on every write,
    // because a query named `get*` can still be a write and only the config
    // document says so.
    expect(calls.map((url) => new URL(url).pathname)).toEqual(['/api/v1/config', '/api/v1/alerts/yara%3Aabc123/ack'])
  })

  it('reopens with the same call, flag flipped', async () => {
    stub(operationsFixtures({ '/api/v1/alerts/stale%3Acowrie/ack': { ok: true, key: 'stale:cowrie', ack: false } }))
    await live('setAlertsAcknowledged')(['stale:cowrie'], false)
    expect(JSON.parse(String(vi.mocked(globalThis.fetch).mock.calls.at(-1)![1]?.body))).toEqual({ ack: false })
  })

  it('acknowledges N keys as N requests — there is no bulk endpoint', async () => {
    // Gap #1. The loop is the contract, not a workaround: stores.rs exposes
    // one POST per key and no scope=all to ask for.
    const calls = stub(operationsFixtures({
      '/api/v1/alerts/yara%3Aabc123/ack': { ok: true, key: 'yara:abc123', ack: true },
      '/api/v1/alerts/stale%3Acowrie/ack': { ok: true, key: 'stale:cowrie', ack: true },
    }))
    expect(await live('acknowledgeAllAlerts')()).toBe(2)
    // One page read plus one POST per OPEN key: the already-acknowledged
    // record is skipped, so the call count follows the open set. The
    // read-only guard is spent once per WRITE CALL, not once per key.
    expect(calls.map((url) => new URL(url).pathname)).toEqual([
      '/api/v1/config',
      '/api/v1/alerts',
      '/api/v1/config',
      '/api/v1/alerts/yara%3Aabc123/ack',
      '/api/v1/alerts/stale%3Acowrie/ack',
    ])
  })

  it('acknowledges nothing when every alert is already acknowledged', async () => {
    const calls = stub(operationsFixtures({ '/api/v1/alerts': { total: 1, rows: [alertDoc('yara:abc123', true)] } }))
    expect(await live('acknowledgeAllAlerts')()).toBe(0)
    // The page read and the two read-only guards; with no open key left there
    // is no POST to spend.
    expect(calls.map((url) => new URL(url).pathname)).toEqual(['/api/v1/config', '/api/v1/alerts', '/api/v1/config'])
  })

  it('finds a group page by key in the same store page the board reads', async () => {
    const calls = stub(operationsFixtures())
    const detail = await live('getAlertDetail')('yara:abc123')
    expect(detail?.group).toMatchObject({ kind: 'yara', members: [{ key: 'yara:abc123' }] })
    expect(new URL(calls[0]).pathname).toBe('/api/v1/alerts')
    // A key the store does not hold is the page's own 404.
    expect(await live('getAlertDetail')('nope')).toBeNull()
  })

  it('picks the evidence pane pivots off the message and the link', async () => {
    stub(operationsFixtures({
      '/api/v1/alerts': { total: 1, rows: [{ ...alertDoc('yara:abc123'), Message: 'malware d41d8cd98f00b204e9800998ecf8427e00000000000000000000000000000000 from 203.0.113.42', Link: '/events?q=198.51.100.7' }] },
    }))
    const detail = await live('getAlertDetail')('yara:abc123')
    expect(detail?.sources.sort()).toEqual(['198.51.100.7', '203.0.113.42'])
    // A 32-hex name is a MD5 of the empty string, not a hash of anything
    // here: the pane pivots on sha256 digests, so only a 64-hex run counts.
    expect(detail?.hashes).toEqual(['d41d8cd98f00b204e9800998ecf8427e00000000000000000000000000000000'])
    expect(detail?.hashes).not.toContain('d41d8cd98f00b204e9800998ecf8427e')
  })

  it('refuses a write while the deployment is read-only', async () => {
    stub(operationsFixtures({ '/api/v1/config': { ...configWire, payload: { behavior: { read_only: true } } } }))
    await expect(live('setAlertsAcknowledged')(['yara:abc123'], true)).rejects.toThrow(ApiError)
    await expect(live('acknowledgeAllAlerts')()).rejects.toThrow(ApiError)
  })
})

describe('the dead-letter purge, an admin-only destructive write', () => {
  it('DELETEs the same q scope the list searched', async () => {
    // The issue body says `/api/v1/store/dead-letters`, and there is no such
    // literal route: the route IS `/api/v1/store/{name}` (stores.rs L553 /
    // L601) and `name` is the allowlist key `store_config` spells
    // "dead-letters". So the path is the same, and the scope is `q`.
    const calls = stub(operationsFixtures({ '/api/v1/store/dead-letters': { deleted: 7 } }))
    expect(await live('purgeDeadLetters')('mapper_parsing_exception')).toBe(7)
    expect(calls).toHaveLength(2)
    const call = vi.mocked(globalThis.fetch).mock.calls.at(-1)!
    expect(call[1]?.method).toBe('DELETE')
    expect(new URL(String(call[0])).searchParams.get('q')).toBe('mapper_parsing_exception')
  })

  it('purges every retained dead letter when the query box is empty', async () => {
    // The documented "the operator purges exactly the scope they were looking
    // at" contract: an absent q is a match_all, not a no-op.
    const calls = stub(operationsFixtures({ '/api/v1/store/dead-letters': { deleted: 91 } }))
    expect(await live('purgeDeadLetters')('   ')).toBe(91)
    expect(new URL(String(vi.mocked(globalThis.fetch).mock.calls.at(-1)![0])).searchParams.has('q')).toBe(false)
    expect(calls.map((url) => new URL(url).pathname)).toEqual(['/api/v1/config', '/api/v1/store/dead-letters'])
  })

  it('refuses a viewer before any fetch, and a session-less caller too', async () => {
    const calls = stub(operationsFixtures({ '/api/v1/store/dead-letters': { deleted: 7 } }))
    const viewer = { name: 'Analyst', email: 'a@example.test', roles: ['viewer'] }
    await expect(liveQuery('purgeDeadLetters', viewer)!('x')).rejects.toThrow(ApiError)
    await expect(liveQuery('purgeDeadLetters', null)!('x')).rejects.toThrow(ApiError)
    // Nothing reached the backend: the refusal is the seam's, made first.
    expect(calls).toEqual([])
  })

  it('still refuses under read-only', async () => {
    stub(operationsFixtures({ '/api/v1/config': { ...configWire, payload: { behavior: { read_only: true } } } }))
    await expect(live('purgeDeadLetters')('x')).rejects.toThrow(ApiError)
  })

  it('reads a row that names none of the expected keys without throwing', async () => {
    // Gap #9: the documents are written by Elasticsearch, not this repo, so
    // which keys a row carries is unverified. Every unknown degrades to a
    // blank cell, never to an exception and never to an invented value.
    stub(operationsFixtures({ '/api/v1/store/dead-letters': { total: 1, rows: [{ _doc_id: 'dl-2', '@timestamp': '2026-10-04T19:00:00Z', whatever: 'unmapped' }] } }))
    const rows = await live('getDeadLetters')('')
    expect(rows[0]).toMatchObject({ id: 'dl-2', timestamp: '2026-10-04T19:00:00Z', reason: '', source: '', index: '' })
  })

  it('reads the alternate key spellings the store rows use', async () => {
    stub(operationsFixtures({ '/api/v1/store/dead-letters': { total: 1, rows: [{ _doc_id: 'dl-3', '@timestamp': '2026-10-04T19:00:00Z', error: 'boom', pipeline: 'filebeat' }] } }))
    expect((await live('getDeadLetters')(''))[0]).toMatchObject({ reason: 'boom', source: 'filebeat' })
  })

  it('sends the query box as the store q, verbatim', async () => {
    const calls = stub(operationsFixtures())
    await live('getDeadLetters')('  mapper_parsing  ')
    const search = new URL(calls[0]).searchParams
    expect(search.get('q')).toBe('mapper_parsing')
    expect(Object.fromEntries([...search].filter(([k]) => k !== 'q'))).toEqual({ offset: '0', size: '100' })
  })

  it('leaves index empty: the store adds _doc_id, not an index field', async () => {
    // Gap #8. There is no `_index` on the row to read, so the page's column
    // is blank rather than guessed at from the store name.
    stub(operationsFixtures())
    expect((await live('getDeadLetters')(''))[0].index).toBe('')
  })
})

describe('source health', () => {
  it('maps the whole document, and reads deadLetters as the 24h count its tile claims', async () => {
    // Gap #11: the page's tile says "last 24 h", so it is fed
    // `ingest.recent_dead_letters` (3), NOT the wire's all-time
    // `dead_letters` (91) which is a different number entirely.
    const calls = stub(operationsFixtures())
    const health = await live('getSourceHealth')()
    expect(new URL(calls[0]).pathname).toBe('/api/v1/source-health')
    expect(health).toMatchObject({ clusterStatus: 'green', indexedDocuments: 12_345, deadLetters: 3, unattributed24h: 4 })
    expect(health.feeds).toEqual([{ sensor: 'cowrie', state: 'fresh', documents: 900, lastSeen: '2026-10-04T20:41:03Z' }])
    expect(health.ingest).toMatchObject({ state: 'fresh', recentDeadLetters: 3 })
  })

  it('has no webhook field to carry the delivery health', async () => {
    // Gap #10: the wire's `webhook` is typed and tested in
    // contracts/operations.ts but deliberately not added to the page type
    // (per scope), so it is dropped rather than smuggled onto another field.
    stub(operationsFixtures())
    const health = await live('getSourceHealth')()
    expect(health).not.toHaveProperty('webhook')
  })

  it('reads a cluster status the page cannot colour as yellow, never as green', async () => {
    stub(operationsFixtures({ '/api/v1/source-health': { ...healthWire, cluster_status: 'unreachable' } }))
    expect((await live('getSourceHealth')()).clusterStatus).toBe('yellow')
  })

  it('reads a disabled pipeline as stopped and a 5xx as stopped', async () => {
    stub(operationsFixtures({ '/api/v1/source-health': { ...healthWire, pipeline: { ...healthWire.pipeline, state: 'disabled' } } }))
    expect((await live('getSourceHealth')()).pipeline.state).toBe('stopped')
    stub(operationsFixtures({ '/api/v1/source-health': { ...healthWire, pipeline: { ...healthWire.pipeline, state: '503 Service Unavailable' } } }))
    expect((await live('getSourceHealth')()).pipeline.state).toBe('stopped')
    stub(operationsFixtures({ '/api/v1/source-health': { ...healthWire, pipeline: { ...healthWire.pipeline, state: '404 Not Found' } } }))
    expect((await live('getSourceHealth')()).pipeline.state).toBe('degraded')
  })
})

describe('the fleet topology', () => {
  it('joins the static shape with the feeds and the container states', async () => {
    const calls = stub(operationsFixtures())
    const topo = await live('getTopology')()
    // Three requests: the shape, the feeds and the container states are
    // three documents (topology.rs: "static fleet shape; liveness joins
    // live elsewhere").
    expect(calls.map((url) => new URL(url).pathname).sort()).toEqual(['/api/v1/services', '/api/v1/source-health', '/api/v1/topology'])
    expect(topo.sensors).toEqual([
      { sensor: 'cowrie', ingress: ['portbridge'], hostnames: [], ports: [{ proto: 'tcp', public: 22, host: 19022 }], rawIndex: 'honeypot-v2', feed: 'fresh' },
      { sensor: 'dionaea', ingress: ['traefik'], hostnames: ['smtp.example.test'], ports: [], rawIndex: 'unmapped', feed: 'silent' },
    ])
    expect(topo.stacks).toEqual([{ stack: 'honeypot-cowrie', containers: [{ name: 'hp-cowrie', state: 'running' }] }])
  })

  it('drops an ingress the page cannot colour, and names the survivors it can', async () => {
    // Gap #6: the wire's vocabulary is traefik / portbridge / tunnel-only,
    // and the page's adds "direct" / "+PROXY" which the wire never emits.
    // "tunnel-only" is dropped; the other two stay.
    stub(operationsFixtures())
    expect((await live('getTopology')()).sensors[0].ingress).toEqual(['portbridge'])
  })

  it('turns flow node names into the indices the sankey wants', async () => {
    stub(operationsFixtures())
    const { flow } = await live('getTopology')()
    expect(flow.links).toEqual([{ source: 0, target: 1, value: 1 }])
  })

  it('reads an unavailable services adapter as no live state, not as stopped', async () => {
    stub(operationsFixtures({ '/api/v1/services': { available: false, services: [] } }))
    expect((await live('getTopology')()).stacks[0].containers[0]).toEqual({ name: 'hp-cowrie', state: 'unknown' })
  })

  it('fails loudly rather than showing every container as unknown', async () => {
    // The dangerous wrong answer is a topology that reads "nothing is
    // running" when the backend is merely down.
    for (const path of ['/api/v1/topology', '/api/v1/source-health', '/api/v1/services']) {
      stub(operationsFixtures({ [path]: fail(502) }))
      await expect(live('getTopology')()).rejects.toThrow(ApiError)
    }
  })
})

describe('sensors', () => {
  it('reads the catalog as the one aggregation it is', async () => {
    const calls = stub(operationsFixtures())
    expect(await live('getSensorCatalog')()).toEqual([{ sensor: 'cowrie', events: 900 }])
    expect(new URL(calls[0]).pathname).toBe('/api/v1/sensors/catalog')
  })

  it('builds a detail from the overview bundle and the sensor-event rows', async () => {
    const calls = stub(operationsFixtures())
    const detail = (await live('getSensorDetail')('cowrie'))!
    expect(calls.map((url) => new URL(url).pathname).sort()).toEqual([
      '/api/v1/sensors/cowrie/events',
      '/api/v1/sensors/cowrie/overview',
      '/api/v1/source-health',
      '/api/v1/topology',
    ])
    expect(detail).toMatchObject({ uniqueSources: 40, firstSeen: '2026-10-04T08:00:00Z', topSources: [{ label: '203.0.113.42', count: 7 }], topLists: [{ label: 'commands' }] })
    expect(detail.timeline.map((b) => b.total)).toEqual([4, 9])
    expect(detail.measures).toEqual([{ label: 'commands', value: 120, peak: '9 max' }])
    expect(detail.recentEvents).toHaveLength(1)
  })

  it('leaves byType and reading empty: the overview carries neither', async () => {
    // Gap #7. Returned empty, not faked: there is no endpoint that could
    // fill either, and a fabricated leaderboard would be a worse lie than a
    // blank panel.
    stub(operationsFixtures())
    const detail = (await live('getSensorDetail')('cowrie'))!
    expect(detail.byType).toEqual([])
    expect(detail.reading).toEqual({ what: '', columns: [], artefacts: [] })
  })

  it('leaves a live sensor identity blank rather than inventing one', async () => {
    // The catalog is a terms aggregation: it has a name, a count and a
    // last-seen, and no kind, ports, persona or location. The header's
    // "no listener" and blank decoy are the honest rendering of that.
    stub(operationsFixtures())
    const { sensor } = (await live('getSensorDetail')('cowrie'))!
    expect(sensor).toMatchObject({ id: 'cowrie', name: 'cowrie', kind: '', what: '', location: '', status: 'online', eventsLast24h: 900 })
    // The ports ARE real: the topology's exposure is the sensor's listening
    // surface, and the header lists the host leg.
    expect(sensor.ports).toEqual([{ proto: 'tcp', port: 19022 }])
  })

  it('reads the health page own verdict as the sensor status, not an inference', async () => {
    const detail = async (state: string) => {
      stub(operationsFixtures({ '/api/v1/source-health': { ...healthWire, sensors: [{ ...healthWire.sensors[0], state }] } }))
      return (await live('getSensorDetail')('cowrie'))!.sensor.status
    }
    expect(await detail('ACTIVE')).toBe('online')
    expect(await detail('QUIET')).toBe('degraded')
    expect(await detail('STALE')).toBe('degraded')
  })

  it('answers a sensor the backend does not have with null, not an error', async () => {
    stub(operationsFixtures({ '/api/v1/sensors/ghost/overview': fail(404, 'not found'), '/api/v1/sensors/ghost/events': { sensor: 'ghost', total: 0, rows: [] } }))
    // The 404 is the overview's, and the other three legs are asked in the
    // same fan-out — but only the overview decides the answer.
    expect(await live('getSensorDetail')('ghost')).toBeNull()
  })

  it('keeps a sensor-event row as the sensor wrote it, with only the classified fields filled', async () => {
    // These rows are sensors.rs `SensorEvent`, NOT the shared events.rs
    // `EventRow`: no pivots, no country, no session. The eleven gaps are
    // filled at the seam with what is genuinely absent upstream — the kind
    // off the sensor's own event name, everything else empty or `info`.
    stub(operationsFixtures())
    const [sensorEvent] = (await live('getSensorDetail')('cowrie'))!.recentEvents
    expect(sensorEvent).toMatchObject({ id: 'ev-1', sensor: 'cowrie', srcIp: '203.0.113.42', srcPort: 51322, dstPort: 19022, type: 'command.input', eventName: 'cowrie.command.input', severity: 'info' })
    expect(sensorEvent.fields).toEqual({ eventid: 'cowrie.command.input', input: 'uname -a' })
    expect(sensorEvent).toMatchObject({ asn: '', org: '', city: '', country: '', sessionId: '', techniques: [] })
  })
})

describe('the operations slice fails as an error, never as an empty panel', () => {
  it('maps a 502 on each endpoint to the state the unavailable scenario produces', async () => {
    const cases: Array<[string, () => Promise<unknown>, Record<string, unknown>]> = [
      ['getSensorCatalog', () => live('getSensorCatalog')(), { '/api/v1/sensors/catalog': fail(502) }],
      ['getSensorDetail', () => live('getSensorDetail')('cowrie'), { '/api/v1/sensors/cowrie/overview': fail(502) }],
      ['getSensorDetail (events)', () => live('getSensorDetail')('cowrie'), { '/api/v1/sensors/cowrie/overview': sensorOverviewWire, '/api/v1/sensors/cowrie/events': fail(502), '/api/v1/source-health': healthWire, '/api/v1/topology': topologyWire }],
      ['getAlerts', () => live('getAlerts')(), { '/api/v1/alerts': fail(502) }],
      ['getOpenAlertCount', () => live('getOpenAlertCount')(), { '/api/v1/alerts': fail(502) }],
      ['getAlertDetail', () => live('getAlertDetail')('yara:abc123'), { '/api/v1/alerts': fail(502) }],
      ['getSourceHealth', () => live('getSourceHealth')(), { '/api/v1/source-health': fail(502) }],
      ['getDeadLetters', () => live('getDeadLetters')('x'), { '/api/v1/store/dead-letters': fail(502) }],
      ['purgeDeadLetters', () => live('purgeDeadLetters')('x'), { '/api/v1/config': configWire, '/api/v1/store/dead-letters': fail(502) }],
      ['setAlertsAcknowledged', () => live('setAlertsAcknowledged')(['k'], true), { '/api/v1/config': configWire, '/api/v1/alerts/k/ack': fail(502) }],
      ['acknowledgeAllAlerts', () => live('acknowledgeAllAlerts')(), { '/api/v1/config': configWire, '/api/v1/alerts': { total: 1, rows: [alertDoc('k')] }, '/api/v1/alerts/k/ack': fail(502) }],
    ]
    for (const [name, call, fixtures] of cases) {
      stub(operationsFixtures(fixtures))
      await expect(call(), name).rejects.toThrow(ApiError)
    }
  })

  it('never renders a failed operations fetch as an empty fleet', async () => {
    stub({
      '/api/v1/sensors/catalog': () => {
        throw new TypeError('fetch failed')
      },
    })
    const out = await live('getSensorCatalog')().catch((error: unknown) => error)
    expect(out).toBeInstanceOf(ApiError)
    expect((out as ApiError).kind).toBe('unavailable')
  })
})
