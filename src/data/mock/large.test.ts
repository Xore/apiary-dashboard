import { describe, expect, it } from 'vitest'
import { enlarged, enlargedRead, originalArgs } from './large'

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

describe('enlargedRead', () => {
  const REAL = Array.from({ length: 10 }, (_, i) => ({ id: `r${i}` }))
  const run = (args: unknown[]) => {
    const { offset = 0, limit = REAL.length } = args[0] as { offset?: number; limit?: number }
    return Promise.resolve({ rows: REAL.slice(offset, offset + limit), total: REAL.length, offset })
  }

  it('serves any page of the scaled total, cycling the real rows as copies', async () => {
    const args = [{ offset: 25, limit: 10 }]
    const page = (await enlargedRead(await run(args), args, run)) as { rows: Array<{ id: string }>; total: number; offset: number }
    expect(page.total).toBe(1370)
    expect(page.offset).toBe(25)
    expect(page.rows.map((r) => r.id)).toEqual(['r5~2', 'r6~2', 'r7~2', 'r8~2', 'r9~2', 'r0~3', 'r1~3', 'r2~3', 'r3~3', 'r4~3'])
  })

  it('leaves an unpaged read (an export) as the plain enlargement', async () => {
    const args = [{}]
    const page = (await enlargedRead(await run(args), args, run)) as { rows: unknown[]; total: number }
    // A short list grows with copies, as every unpaged list does.
    expect(page.rows).toHaveLength(240)
    expect(page.total).toBe(1370)
  })
})
