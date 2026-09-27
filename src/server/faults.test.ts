// The failure paths production takes when Redis or Keycloak does not
// answer, on the mock store and provider (APIARY_MOCK_FAULTS).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FAULTS_ENV, faulty, warnThrottled } from './faults'
import { resolveUser } from './identity'
import { SESSION_COOKIE, sessions } from './session'
import { signInAvailable } from './signIn'

const account = { sub: 's', username: 'u', displayName: 'U', email: 'u@example.test', role: 'admin' as const }
const withCookie = (sid: string) => new Request('http://dashboard.example.test/', { headers: { cookie: `${SESSION_COOKIE}=${sid}` } })

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('mock faults', () => {
  it('reads the list on every call', () => {
    expect(faulty('session-store')).toBe(false)
    vi.stubEnv(FAULTS_ENV, 'identity-provider, session-store')
    expect(faulty('session-store')).toBe(true)
    expect(faulty('identity-provider')).toBe(true)
  })

  it('treats a request as signed out while the session store does not answer', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sid = await sessions.create(account)
    expect(await resolveUser(withCookie(sid))).toMatchObject({ roles: ['admin'] })
    vi.stubEnv(FAULTS_ENV, 'session-store')
    expect(await resolveUser(withCookie(sid))).toBeNull()
    await expect(sessions.create(account)).rejects.toThrow('session-store unavailable')
    await expect(sessions.destroy(sid)).rejects.toThrow()
    // Back up, the session is still there: an outage signs nobody out for good.
    vi.unstubAllEnvs()
    expect(await resolveUser(withCookie(sid))).not.toBeNull()
  })

  it('says sign-in cannot start while either dependency is down', () => {
    expect(signInAvailable()).toBe(true)
    vi.stubEnv(FAULTS_ENV, 'identity-provider')
    expect(signInAvailable()).toBe(false)
    vi.stubEnv(FAULTS_ENV, 'session-store')
    expect(signInAvailable()).toBe(false)
  })

  it('throttles dependency warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    warnThrottled('a', new Error('x'), 1e14)
    warnThrottled('b', new Error('y'), 1e14 + 1000)
    warnThrottled('c', new Error('z'), 1e14 + 31_000)
    expect(warn.mock.calls.map((c) => c[0])).toEqual(['a', 'c'])
  })
})
