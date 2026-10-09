// getPreferences against the real backend: the subject comes from the
// session record, and a caller with no session never reaches the wire.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { liveQuery } from './api'
import { ApiError } from './errors'
import { DEFAULT_PREFERENCES_WIRE } from './adapters/settings'
import type { Backend } from './backend'

const session = vi.hoisted(() => ({ current: undefined as undefined | { sub: string; username: string; displayName: string; email: string; role: string; createdAt: number } }))

vi.mock('@tanstack/react-start/server', () => ({ getRequest: () => new Request('http://dashboard.test/') }))
vi.mock('#/server/session', () => ({ sidFrom: () => 'sid', sessions: { get: async () => session.current } }))
vi.mock('#/server/identity', () => ({ userOf: (s: { displayName: string; email: string; role: string }) => ({ name: s.displayName, email: s.email, roles: [s.role] }) }))

const getPreferences = () => liveQuery('getPreferences', undefined) as Backend['getPreferences']

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
