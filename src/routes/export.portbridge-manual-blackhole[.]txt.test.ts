// GET /export/portbridge-manual-blackhole.txt: the firewall puller's list.
// Who may read it: a machine client with X-Service-Token equal to
// SERVICE_TOKEN, or a signed-in session whose role the query policy allows.
// Nothing else, and the token is never taken from the URL.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from './export.portbridge-manual-blackhole[.]txt'
import type * as AuthorizeModule from '#/server/authorize'
import { authorize } from '#/server/authorize'
import { SESSION_COOKIE, sessions } from '#/server/session'

vi.mock('#/server/authorize', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthorizeModule>()
  return { ...actual, authorize: vi.fn(actual.authorize) }
})

type Handler = (ctx: { request: Request }) => Promise<Response> | Response
const get = (Route as unknown as { options: { server: { handlers: { GET: Handler } } } }).options.server.handlers.GET

const URL_PATH = 'http://dashboard.example.test/export/portbridge-manual-blackhole.txt'
const LIST = '198.51.100.7\n203.0.113.4\n'
const SECRET = 'test-service-token'

/** The backend's answer for the list, and the calls it received. */
function backend(body = LIST) {
  const calls: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(String(url))
      if (new URL(String(url)).pathname !== '/api/v1/ip-block-export') throw new TypeError(`no fixture for ${url}`)
      return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
    }),
  )
  return calls
}

const viewer = { sub: 'viewer', username: 'viewer', displayName: 'Viewer', email: 'viewer@example.test', role: 'viewer' as const }

let sid = ''
const request = (headers: Record<string, string> = {}, url = URL_PATH) => new Request(url, { headers })
const signedIn = (headers: Record<string, string> = {}) => request({ ...headers, cookie: `${SESSION_COOKIE}=${sid}` })

beforeEach(async () => {
  process.env.SERVICE_TOKEN = SECRET
  process.env.BACKEND_URL = 'http://backend.test'
  process.env.APIARY_ALLOW_UNAUTH_DEV = '1'
  sid = await sessions.create(viewer)
  vi.mocked(authorize).mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.BACKEND_URL
  delete process.env.SERVICE_TOKEN
  process.env.APIARY_ALLOW_UNAUTH_DEV = '1'
})

describe('/export/portbridge-manual-blackhole.txt', () => {
  it('refuses an unauthenticated request with 401 and never calls the backend', async () => {
    const calls = backend()
    const response = await get({ request: request() })
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('unauthorized')
    expect(calls).toEqual([])
  })

  it('refuses a wrong service token with 401', async () => {
    const calls = backend()
    const response = await get({ request: request({ 'x-service-token': 'not-the-token' }) })
    expect(response.status).toBe(401)
    expect(calls).toEqual([])
  })

  it('refuses an empty service token header with 401', async () => {
    const response = await get({ request: request({ 'x-service-token': '' }) })
    expect(response.status).toBe(401)
  })

  it('does not accept the token in the URL', async () => {
    const calls = backend()
    const response = await get({ request: request({}, `${URL_PATH}?service_token=${SECRET}&token=${SECRET}`) })
    expect(response.status).toBe(401)
    expect(calls).toEqual([])
  })

  it('serves the list unchanged to a machine client with the correct token', async () => {
    const calls = backend()
    const response = await get({ request: request({ 'x-service-token': SECRET }) })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toBe(LIST)
    expect(calls.map((url) => new URL(url).pathname)).toEqual(['/api/v1/ip-block-export'])
  })

  it('never echoes the token in the response', async () => {
    backend()
    const response = await get({ request: request({ 'x-service-token': SECRET }) })
    expect(JSON.stringify([...response.headers.entries()])).not.toContain(SECRET)
    expect(await response.text()).not.toContain(SECRET)
  })

  it('serves the list to a signed-in session whose role the policy allows', async () => {
    const calls = backend()
    const response = await get({ request: signedIn() })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(LIST)
    expect(authorize).toHaveBeenCalledWith('getBlockedIps', expect.objectContaining({ roles: ['viewer'] }))
    expect(calls).toHaveLength(1)
  })

  it('refuses a signed-in session whose role the policy refuses with 403', async () => {
    const calls = backend()
    vi.mocked(authorize).mockReturnValueOnce('admin-only')
    const response = await get({ request: signedIn() })
    expect(response.status).toBe(403)
    expect(calls).toEqual([])
  })

  it('refuses every caller when SERVICE_TOKEN is unset, even with a token', async () => {
    delete process.env.SERVICE_TOKEN
    const calls = backend()
    const response = await get({ request: request({ 'x-service-token': '' }) })
    expect(response.status).toBe(401)
    const withSome = await get({ request: request({ 'x-service-token': SECRET }) })
    expect(withSome.status).toBe(401)
    expect(calls).toEqual([])
  })
})
