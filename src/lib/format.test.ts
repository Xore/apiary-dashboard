import { afterEach, describe, expect, it } from 'vitest'
import { configureTime, formatChange, formatRelative, zoneLabel, formatClock, formatCompact, formatDateTime, formatDay, formatNumber, formatTime } from './format'

describe('formatters', () => {
  const iso = '2026-09-23T09:05:07Z'

  it('render times in UTC regardless of the host timezone', () => {
    expect(formatTime(iso)).toBe('09:05 UTC')
    expect(formatClock(iso)).toBe('09:05')
    expect(formatDateTime(iso)).toBe('23 Sept, 09:05:07 UTC')
    expect(formatDay(iso)).toBe('23 Sept')
  })

  it('format numbers', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
    expect(formatCompact(1800)).toBe('1.8K')
  })

  it('describe period-over-period change', () => {
    expect(formatChange(150, 100)).toBe('+50.0%')
    expect(formatChange(50, 100)).toBe('-50.0%')
    expect(formatChange(0, 0)).toBe('0%')
    expect(formatChange(5, 0)).toBe('new')
  })
})

describe('time preferences', () => {
  const iso = '2026-09-23T09:05:07Z'
  afterEach(() => configureTime({ timeZone: 'UTC', hour12: false, relative: false, now: () => Date.now() }))

  it('shows times in the chosen zone, named', () => {
    configureTime({ timeZone: 'Europe/Berlin' })
    expect(formatClock(iso)).toBe('11:05')
    expect(zoneLabel()).toMatch(/CEST|GMT\+2/)
    expect(formatTime(iso)).toContain('11:05')
  })

  it('shows a 12-hour clock when asked', () => {
    configureTime({ hour12: true })
    expect(formatClock('2026-09-23T15:05:07Z')).toMatch(/0?3:05\s?pm/i)
  })

  it('counts back from the clock for relative timestamps', () => {
    const now = Date.parse('2026-09-23T12:00:00Z')
    configureTime({ relative: true, now: () => now })
    expect(formatRelative('2026-09-23T11:59:40Z')).toBe('just now')
    expect(formatDateTime('2026-09-23T11:55:00Z')).toBe('5 min ago')
    expect(formatDateTime('2026-09-23T09:00:00Z')).toBe('3 h ago')
    expect(formatDateTime('2026-09-21T12:00:00Z')).toBe('2 d ago')
    // Newer than the clock (a live event): still "just now".
    expect(formatRelative('2026-09-23T12:00:30Z')).toBe('just now')
  })
})
