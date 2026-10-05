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
    expect(liveQuery('getAlerts', undefined)).toBeUndefined()
    expect(liveQuery('getOverview', undefined)).toBeUndefined()
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