import { describe, expect, it } from 'vitest'
import { MemorySessionStore, SESSION_COOKIE, clearSessionCookie, sessionCookie, sidFrom } from './session'

const account = { sub: 's', username: 'u', displayName: 'U', email: 'u@example.test', role: 'viewer' as const }

describe('sessions', () => {
  it('keeps a session behind an opaque id until it expires', async () => {
    let now = 1_000_000
    const store = new MemorySessionStore(() => now)
    const sid = await store.create(account)
    expect(sid).toMatch(/^[\w-]{43}$/)
    expect(await store.get(sid)).toMatchObject(account)
    now += 12 * 3600 * 1000
    expect(await store.get(sid)).toBeNull()
  })

  it('forgets a destroyed or unknown id', async () => {
    const store = new MemorySessionStore()
    const sid = await store.create(account)
    await store.destroy(sid)
    expect(await store.get(sid)).toBeNull()
    expect(await store.get('x'.repeat(200))).toBeNull()
    expect(await store.get(undefined)).toBeNull()
  })

  it('uses the canonical cookie', () => {
    expect(sessionCookie('abc')).toBe(`${SESSION_COOKIE}=abc; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`)
    expect(clearSessionCookie()).toContain('Max-Age=0')
    expect(sidFrom(new Request('http://x/', { headers: { cookie: `other=1; ${SESSION_COOKIE}=abc` } }))).toBe('abc')
  })
})
