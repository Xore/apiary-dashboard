import { describe, expect, it } from 'vitest'
import { basePathOf } from './listContext'

describe('basePathOf', () => {
  it('matches an entity and its tabs, not look-alikes', () => {
    expect(basePathOf('/sources/192.0.2.1', '/sources/192.0.2.1')).toBe(true)
    expect(basePathOf('/sources/192.0.2.1/sessions?range=7d', '/sources/192.0.2.1')).toBe(true)
    expect(basePathOf('/sources/192.0.2.10', '/sources/192.0.2.1')).toBe(false)
  })

  it('compares encoded and decoded forms alike', () => {
    expect(basePathOf('/alerts/yara%7Cmatch%20%23', '/alerts/yara|match #')).toBe(true)
    expect(basePathOf('/networks/192.0.2.0%2F26/timeline', '/networks/192.0.2.0/26')).toBe(true)
  })
})
