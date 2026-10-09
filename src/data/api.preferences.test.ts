// getPreferences and savePreferences against the real backend: the subject
// comes from the session record, and a caller with no session never reaches
// the wire.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { liveQuery } from './api'
import { ApiError } from './errors'
import { DEFAULT_PREFERENCES_WIRE, preferences } from './adapters/settings'
import type { Backend } from './backend'

const session = vi.hoisted(() => ({ current: undefined as undefined | { sub: string; username: string; displayName: string; email: string; role: string; createdAt: number } }))

vi.mock('@tanstack/react-start/server', () => ({ getRequest: () => new Request('http://dashboard.test/') }))
vi.mock('#/server/session', () => ({ sidFrom: () => 'sid', sessions: { get: async () => session.current } }))
vi.mock('#/server/identity', () => ({ userOf: (s: { displayName: string; email: string; role: string }) => ({ name: s.displayName, email: s.email, roles: [s.role] }) }))

const getPreferences = () => liveQuery('getPreferences', undefined) as Backend['getPreferences']
const savePreferences = () => liveQuery('savePreferences', undefined) as Backend['savePreferences']

const wire = { revision: 3, preferences: { ...DEFAULT_PREFERENCES_WIRE, theme: 'dark', rows_per_page: 100 } }

beforeEach(() => {
  process.env.BACKEND_URL = 'http://backend.test'
  process.env.SERVICE_TOKEN = 'test-token'
})

afterEach(() => {
  vi.unstubAllGlobals()
  session.current = undefined
  delete process.env.BACKEND_URL
  delete process.env.SERVICE_TOKEN
})

describe('getPreferences', () => {
  it('answers the backend defaults before sign-in, without a call', async () => {
    // A PUBLIC_QUERY the sign-in page renders with: an empty subject is a 400
    // on the wire, so calling it would fail the page that signs you in.
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await getPreferences()()).toMatchObject({ theme: 'system', rowsPerPage: 50 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reads the signed-in operator\'s document by session subject, with the service token', async () => {
    session.current = { sub: 'oidc|1', username: 'operator', displayName: 'Operator', email: 'o@example.test', role: 'admin', createdAt: 0 }
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(wire), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await getPreferences()()).toMatchObject({ theme: 'dark', rowsPerPage: 100 })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/api/v1/preferences')
    expect(Object.fromEntries(parsed.searchParams)).toEqual({ subject: 'oidc|1', username: 'operator', role: 'admin' })
    expect((init.headers as Record<string, string>)['x-service-token']).toBe('test-token')
  })

  it('fails as an ApiError when the backend refuses', async () => {
    session.current = { sub: 'oidc|1', username: 'operator', displayName: 'Operator', email: 'o@example.test', role: 'admin', createdAt: 0 }
    vi.stubGlobal('fetch', vi.fn(async () => new Response('store down', { status: 502 })))
    await expect(getPreferences()()).rejects.toThrow(ApiError)
  })
})

describe('savePreferences', () => {
  const operator = { sub: 'oidc|1', username: 'operator', displayName: 'Operator', email: 'o@example.test', role: 'admin', createdAt: 0 }
  // The stored document has the operator's rows_per_page; the page's own
  // view of it is the baseline a save diffs against.
  const stored = { revision: 3, preferences: { ...DEFAULT_PREFERENCES_WIRE, rows_per_page: 100 } }
  const current = preferences(stored.preferences)

  /** Serves the GET with the stored document and answers any PUT with `put`,
   * recording every request so a test can read the bodies that were sent. */
  const serve = (put: () => Response = () => new Response(JSON.stringify(stored), { status: 200 })) => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => (init?.method === 'PUT' ? put() : new Response(JSON.stringify(stored), { status: 200 })))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }
  const putBody = (fetchMock: ReturnType<typeof serve>) => {
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
    return put ? JSON.parse(String(put[1]?.body)) : undefined
  }

  it('sends a PUT carrying only the field that changed', async () => {
    session.current = operator
    const fetchMock = serve()
    await savePreferences()({ ...current, theme: 'dark' })
    expect(putBody(fetchMock)).toEqual({ subject: 'oidc|1', username: 'operator', patch: { theme: 'dark' } })
    const [url, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'PUT') as unknown as [string, RequestInit]
    expect(new URL(url).pathname).toBe('/api/v1/preferences')
    expect((init.headers as Record<string, string>)['x-service-token']).toBe('test-token')
  })

  it('makes no PUT when nothing differs from the stored document', async () => {
    session.current = operator
    const fetchMock = serve()
    await savePreferences()(current)
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
  })

  it('never sends a page-only field, even when it is the only thing that differs', async () => {
    // notifyCanary and mapBasemap have no wire field; the patch struct would
    // 400 the whole save on either, so a change to them alone is no write.
    session.current = operator
    const fetchMock = serve()
    await savePreferences()({ ...current, notifyCanary: true })
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
  })

  it('refuses a caller with no session before any request', async () => {
    const fetchMock = serve()
    await expect(savePreferences()({ ...current, theme: 'dark' })).rejects.toMatchObject({ kind: 'expired' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces a backend 400 as an ApiError', async () => {
    session.current = operator
    serve(() => new Response('unknown field', { status: 400 }))
    await expect(savePreferences()({ ...current, theme: 'dark' })).rejects.toThrow(ApiError)
  })
})
