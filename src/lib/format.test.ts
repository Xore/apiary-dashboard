import { describe, expect, it } from 'vitest'
import { formatChange, formatClock, formatCompact, formatDateTime, formatDay, formatNumber, formatTime } from './format'

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
