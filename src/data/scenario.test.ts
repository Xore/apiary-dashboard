// The mock scenarios every page's states are designed against: the facade
// must wrap every query, and each scenario must behave like the backend
// state it names.
import { afterEach, describe, expect, it } from 'vitest'
import { ApiError, asApiError } from './errors'
import * as q from './queries'
import * as impl from './queries.impl'
import { setMockScenario } from './scenario'

afterEach(() => setMockScenario('normal'))

const failure = async (run: () => Promise<unknown>) => {
  try {
    await run()
  } catch (e) {
    return asApiError(e)
  }
  return undefined
}

describe('mock scenarios', () => {
  it('the facade wraps every query of the implementation', () => {
    const asyncImpl = Object.entries(impl).filter(([, v]) => typeof v === 'function' && v.constructor.name === 'AsyncFunction').map(([k]) => k)
    expect(asyncImpl.length).toBeGreaterThan(80)
    for (const name of asyncImpl) expect(q, name).toHaveProperty(name)
  })

  it('empty: lists empty and counts zero, catalogs and fixed measures kept', async () => {
    setMockScenario('empty')
    const events = await q.getEvents({})
    expect(events.rows).toEqual([])
    expect(events.total).toBe(0)
    const overview = await q.getOverview()
    expect(overview.kpis.length).toBeGreaterThan(0)
    expect(overview.kpis.every((k) => k.value === 0)).toBe(true)
    expect((await q.getReports()).templates.length).toBeGreaterThan(0)
    expect((await q.getReports()).definitions).toEqual([])
  })

  it('outages fail every call with their own kind, the session survives', async () => {
    for (const [scenario, kind] of [['unavailable', 'unavailable'], ['overloaded', 'overloaded'], ['expired', 'expired']] as const) {
      setMockScenario(scenario)
      const error = await failure(() => q.getEvents({}))
      expect(error?.kind, scenario).toBe(kind)
      expect((await q.getSessionUser()).name).toBeTruthy()
    }
    setMockScenario('overloaded')
    expect((await failure(() => q.getAlerts()))?.retryAfter).toBe(30)
  })

  it('partial: the same reads fail every time, the rest answer', async () => {
    setMockScenario('partial')
    const names = ['getEvents', 'getAlerts', 'getOverview', 'getSourceHealth', 'getTopology', 'getFacets', 'getPayloads', 'getReports', 'getSourceProfiles'] as const
    const outcome = async () => Promise.all(names.map(async (n) => (await failure(() => (q[n] as (...a: unknown[]) => Promise<unknown>)({}))) === undefined))
    const first = await outcome()
    expect(first).toEqual(await outcome())
    expect(first.some(Boolean) && first.some((ok) => !ok)).toBe(true)
  })

  it('viewer: signed in without admin, admin writes refused, other writes allowed', async () => {
    setMockScenario('viewer')
    expect((await q.getSessionUser()).roles).toEqual(['viewer'])
    expect((await failure(() => q.setIpBlocked('198.51.100.1', true)))?.kind).toBe('forbidden')
    expect(await failure(() => q.setAlertsAcknowledged([], true))).toBeUndefined()
  })

  it('an ApiError survives being reduced to its message', () => {
    const original = new ApiError('overloaded', 'getEvents', { retryAfter: 30 })
    const rebuilt = asApiError(new Error(original.message))
    expect(rebuilt).toMatchObject({ kind: 'overloaded', endpoint: 'getEvents', status: 503, retryAfter: 30 })
    expect(asApiError(new Error('something else'))).toBeUndefined()
  })
})
