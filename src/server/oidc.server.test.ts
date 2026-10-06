import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeRedis } from './fakeRedis.test-util'
import type * as SessionModule from './session'
import type { MemorySessionStore } from './session'

const grant = vi.fn()
vi.mock('openid-client', () => ({
  discovery: vi.fn(async () => ({ issuer: 'kc' })),
  allowInsecureRequests: vi.fn(),
  randomPKCECodeVerifier: () => 'verifier',
  calculatePKCECodeChallenge: async (v: string) => `challenge-of-${v}`,
  buildAuthorizationUrl: (_c: unknown, params: Record<string, string>) => new URL(`https://kc.example.test/auth?${new URLSearchParams(params)}`),
  authorizationCodeGrant: (...args: unknown[]) => grant(...args),
  buildEndSessionUrl: (_c: unknown, params: Record<string, string>) => new URL(`https://kc.example.test/logout?${new URLSearchParams(params)}`),
}))

const { store } = vi.hoisted(() => ({ store: { current: null as MemorySessionStore | null } }))
vi.mock('./session', async (original) => {
  const actual = await original<typeof SessionModule>()
  store.current = new actual.MemorySessionStore()
  return { ...actual, sessions: store.current, redis: () => null }
})

const { beginLogin, completeLogin, logoutURL } = await import('./oidc.server')

const claims = (extra: object) => ({ sub: 'kc-1', preferred_username: 'ada', name: 'Ada', email: 'ada@example.test', ...extra })

describe('Keycloak sign-in', () => {
  beforeEach(() => {
    vi.stubEnv('OIDC_ISSUER_URL', 'https://kc.example.test/realms/apiary')
    vi.stubEnv('EXTERNAL_URL', 'https://dash.example.test')
    grant.mockReset()
  })

  async function begin(returnTo: string) {
    const redis = fakeRedis()
    const location = new URL(await beginLogin(new Request(`http://internal:3000/auth/login?return_to=${encodeURIComponent(returnTo)}`), redis))
    return { redis, location, state: location.searchParams.get('state') ?? '' }
  }

  it('starts with PKCE and a one-time state that keeps a safe return path', async () => {
    const { redis, location, state } = await begin('/events?q=1')
    expect(location.searchParams.get('code_challenge')).toBe('challenge-of-verifier')
    expect(location.searchParams.get('code_challenge_method')).toBe('S256')
    expect(location.searchParams.get('redirect_uri')).toBe('https://dash.example.test/auth/callback')
    expect(JSON.parse(redis.keys.get(`bff:oidc:pending:${state}`) ?? '')).toEqual({ verifier: 'verifier', returnTo: '/events?q=1' })
    expect(JSON.parse([...(await begin('//evil.example.test')).redis.keys.values()][0]).returnTo).toBe('/')
  })

  it('completes once: a session with the client role, the state spent', async () => {
    const { redis, state } = await begin('/sources')
    grant.mockResolvedValue({ id_token: 'idt', claims: () => claims({ resource_access: { 'apiary-dashboard': { roles: ['admin'] } } }) })
    const callback = new Request(`http://internal:3000/auth/callback?code=c&state=${state}`)
    const done = await completeLogin(callback, redis)
    expect(done?.returnTo).toBe('/sources')
    expect(grant.mock.calls[0][1].href).toBe(`https://dash.example.test/auth/callback?code=c&state=${state}`)
    expect(grant.mock.calls[0][2]).toEqual({ pkceCodeVerifier: 'verifier', expectedState: state })
    expect(await store.current!.get(done?.sid)).toMatchObject({ sub: 'kc-1', username: 'ada', role: 'admin', idToken: 'idt' })
    expect(await completeLogin(callback, redis)).toBeNull()
  })

  it('makes anyone without the client admin role a viewer', async () => {
    const { redis, state } = await begin('/')
    grant.mockResolvedValue({ claims: () => claims({ resource_access: { other: { roles: ['admin'] } } }) })
    const done = await completeLogin(new Request(`http://x/auth/callback?code=c&state=${state}`), redis)
    expect((await store.current!.get(done?.sid))?.role).toBe('viewer')
  })

  it('refuses an unknown state without calling Keycloak, and surfaces a refused code', async () => {
    expect(await completeLogin(new Request('http://x/auth/callback?code=c&state=forged'), fakeRedis())).toBeNull()
    expect(grant).not.toHaveBeenCalled()
    const { redis, state } = await begin('/')
    grant.mockRejectedValue(new Error('invalid_grant'))
    await expect(completeLogin(new Request(`http://x/auth/callback?code=c&state=${state}`), redis)).rejects.toThrow('invalid_grant')
  })

  it('ends the Keycloak session with the id token hint', async () => {
    const url = new URL(await logoutURL(new Request('http://x/auth/logout'), 'idt'))
    expect(url.searchParams.get('id_token_hint')).toBe('idt')
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe('https://dash.example.test/auth/login?signed_out=1')
  })
})
