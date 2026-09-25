import { describe, expect, it } from 'vitest'
import { returnAs, safeReturnTo } from './returnTo'

describe('safeReturnTo', () => {
  it('keeps a path on the dashboard', () => {
    expect(safeReturnTo('/events?sensor=cowrie')).toBe('/events?sensor=cowrie')
  })

  it('refuses anything that could leave it', () => {
    for (const value of ['https://example.test/', '//example.test/', '/\\example.test', 'events', '/a\u0000b', undefined, 42]) expect(safeReturnTo(value)).toBe('/')
  })
})

describe('returnAs', () => {
  it('signs the viewer into the viewer scenario', () => {
    expect(returnAs('/alerts?range=7d', 'viewer')).toBe('/alerts?range=7d&mock=viewer')
  })

  it('leaves the expired-session scenario when signing in again', () => {
    expect(returnAs('/events?mock=expired&sensor=cowrie', 'admin')).toBe('/events?sensor=cowrie')
  })
})
