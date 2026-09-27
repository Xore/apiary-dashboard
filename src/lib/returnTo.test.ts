import { describe, expect, it } from 'vitest'
import { returnAfterSignIn, safeReturnTo } from './returnTo'

describe('safeReturnTo', () => {
  it('keeps a path on the dashboard', () => {
    expect(safeReturnTo('/events?sensor=cowrie')).toBe('/events?sensor=cowrie')
  })

  it('refuses anything that could leave it', () => {
    for (const value of ['https://example.test/', '//example.test/', '/\\example.test', 'events', '/a\u0000b', undefined, 42]) expect(safeReturnTo(value)).toBe('/')
  })
})

describe('returnAfterSignIn', () => {
  it('keeps the path, its filters and a design scenario', () => {
    expect(returnAfterSignIn('/alerts?range=7d&mock=large')).toBe('/alerts?range=7d&mock=large')
  })

  it('drops the scenarios a session replaces', () => {
    expect(returnAfterSignIn('/events?mock=expired&sensor=cowrie')).toBe('/events?sensor=cowrie')
    expect(returnAfterSignIn('/events?mock=viewer')).toBe('/events')
  })

  it('stays on the dashboard', () => {
    expect(returnAfterSignIn('//evil.example.test/')).toBe('/')
  })
})
