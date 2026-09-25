import { describe, expect, it } from 'vitest'
import { enlarged, originalArgs } from './large'

describe('enlarged', () => {
  it('scales counts, not measures', () => {
    expect(enlarged({ events: 1200, dstPort: 22, score: 0.9, kpis: [{ id: 'k', value: 5, previous: 4, trend: [1, 2] }] })).toEqual({
      events: 164400,
      dstPort: 22,
      score: 0.9,
      kpis: [{ id: 'k', value: 685, previous: 548, trend: [137, 274] }],
    })
  })

  it('grows a short list with copies that keep their content', () => {
    const rows = enlarged([{ id: 'a', n: 1 }, { id: 'b', n: 2 }])
    expect(rows).toHaveLength(50)
    expect(rows[2]).toEqual({ id: 'a~1', n: 1 })
    expect(new Set(rows.map((r) => r.id)).size).toBe(50)
  })

  it('leaves lists keyed by address or hash as they are', () => {
    expect(enlarged([{ id: '192.0.2.1' }, { id: '192.0.2.2' }])).toHaveLength(2)
  })

  it('makes some free text long', () => {
    expect(enlarged({ summary: 'abc' }).summary.length).toBeGreaterThan(100)
    expect(enlarged({ summary: 'abcd' }).summary).toBe('abcd')
  })
})

describe('originalArgs', () => {
  it('looks a copy up by its original', () => {
    expect(originalArgs(['anom-1~3', 7, { id: 'x~1' }])).toEqual(['anom-1', 7, { id: 'x~1' }])
  })
})
