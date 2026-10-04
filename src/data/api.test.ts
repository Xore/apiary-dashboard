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

/** Serves one body per path, and records the URLs it was asked for. */
function stub(responses: Record<string, unknown | (() => never)>) {
  const calls: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url)
      const path = new URL(url).pathname
      const body = Object.entries(responses).find(([prefix]) => path.startsWith(prefix))
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
  it('names only this slice, leaving the rest to the mock', () => {
    expect(liveQueryNames().sort()).toEqual(
      ['getCommands', 'getEventDetail', 'getEvents', 'getRecordings', 'getReplayDetail', 'getSessionDetail', 'searchAll', 'searchHistory'].sort(),
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