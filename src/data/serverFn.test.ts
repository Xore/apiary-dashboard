import { describe, expect, it } from 'vitest'
import { clockFor } from './serverFn'

describe('clockFor', () => {
  // A live backend runs on the wall clock, whatever the dev scenario says.
  it('is the wall clock (null) when a live backend is configured', () => {
    expect(clockFor(true, 1_000)).toBeNull()
  })

  it('is the mock tier clock when no live backend is configured', () => {
    expect(clockFor(false, 1_000)).toBe(1_000)
  })
})
