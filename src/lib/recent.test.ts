// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'hp-recent-investigations'
// The module caches what it read, so each test starts from a fresh copy.
const load = () => import('./recent')

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('recent investigations', () => {
  it('records entity pages, newest first, without duplicates, at most five', async () => {
    const { recordRecentFromLocation } = await load()
    for (const ip of ['192.0.2.1', '192.0.2.2', '192.0.2.3', '192.0.2.4', '192.0.2.5', '192.0.2.6']) recordRecentFromLocation(`/sources/${ip}`, '')
    recordRecentFromLocation('/sources/192.0.2.4', '')
    recordRecentFromLocation('/events', '?range=7d')
    const stored = JSON.parse(localStorage.getItem(KEY)!) as Array<{ value: string }>
    expect(stored.map((e) => e.value)).toEqual(['192.0.2.4', '192.0.2.6', '192.0.2.5', '192.0.2.3', '192.0.2.2'])
  })

  it('knows sessions, payloads and an IP filter on events', async () => {
    const { recordRecentFromLocation, hrefForRecent } = await load()
    const hash = 'a'.repeat(64)
    recordRecentFromLocation('/events', '?ip=198.51.100.7')
    recordRecentFromLocation(`/payloads/${hash}`, '')
    recordRecentFromLocation('/sessions/s-1', '')
    const stored = JSON.parse(localStorage.getItem(KEY)!) as Parameters<typeof hrefForRecent>[0][]
    expect(stored.map(hrefForRecent)).toEqual(['/sessions/s-1', `/payloads/${hash}`, '/events?ip=198.51.100.7'])
  })

  it('never turns a stored entry into an unsafe link', async () => {
    localStorage.setItem(KEY, JSON.stringify([{ kind: 'url', value: 'javascript:alert(1)' }, { kind: 'ip', value: 'x'.repeat(200) }, { kind: 'ip', value: '../../auth/logout' }, 'junk']))
    const { recordRecentFromLocation, hrefForRecent } = await load()
    recordRecentFromLocation('/sources/192.0.2.9', '')
    // The stored list is rewritten from what survived validation.
    const kept = JSON.parse(localStorage.getItem(KEY)!) as Parameters<typeof hrefForRecent>[0][]
    expect(kept).toEqual([{ kind: 'ip', value: '192.0.2.9' }, { kind: 'ip', value: '../../auth/logout' }])
    // A value is one path segment, whatever it holds.
    expect(hrefForRecent(kept[1])).toBe('/sources/..%2F..%2Fauth%2Flogout')
  })
})
