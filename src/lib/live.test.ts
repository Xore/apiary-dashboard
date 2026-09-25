// The live layer: the mock stream, the simulated incidents, and the
// edge-triggered conditions the operational toasts are built on.
import { afterEach, describe, expect, it } from 'vitest'
import { resolveAll, simulate } from '#/data/mock/incidents'
import { nextLiveEvent } from '#/data/mock/live'
import * as q from '#/data/queries'
import { conditionsFrom, transitions } from './healthConditions'

afterEach(resolveAll)

describe('live stream', () => {
  it('new events join the event set, newest first, and move the sensor on', async () => {
    const before = (await q.getEvents({})).total
    const silent = new Set(['cowrie'])
    const arrived = Array.from({ length: 40 }, () => nextLiveEvent(silent)).filter((e) => e !== undefined)
    expect(arrived.length).toBeGreaterThan(0)
    expect(arrived.every((e) => e.sensor !== 'cowrie')).toBe(true)
    const { rows, total } = await q.getEvents({})
    expect(total).toBe(before + arrived.length)
    expect(rows[0].id).toBe(arrived.at(-1)!.id)
    const sensor = (await q.getSensorDetail(arrived.at(-1)!.sensor))!.sensor
    expect(sensor.lastSeen).toBe(arrived.at(-1)!.timestamp)
  })
})

describe('operational conditions', () => {
  it('a healthy baseline raises nothing; an incident raises, recovery clears', async () => {
    const baseline = conditionsFrom(await q.getSourceHealth())
    const known = new Map(baseline.map((c) => [c.key, c]))
    expect(transitions(known, baseline)).toEqual({ raised: [], cleared: [] })

    simulate('sensor-silent')
    simulate('ingest-delayed')
    const during = conditionsFrom(await q.getSourceHealth())
    const raised = transitions(known, during).raised.map((c) => c.key)
    expect(raised).toEqual(expect.arrayContaining(['sensor:cowrie', 'ingest']))

    // Behind → stalled is news again; still-stalled is not.
    const duringMap = new Map(during.map((c) => [c.key, c]))
    simulate('ingest-stalled')
    const stalled = conditionsFrom(await q.getSourceHealth())
    expect(transitions(duringMap, stalled).raised.map((c) => c.key)).toEqual(['ingest'])
    expect(transitions(new Map(stalled.map((c) => [c.key, c])), stalled).raised).toEqual([])

    resolveAll()
    const after = conditionsFrom(await q.getSourceHealth())
    expect(transitions(new Map(stalled.map((c) => [c.key, c])), after).cleared.map((c) => c.key).sort()).toEqual(['ingest', 'sensor:cowrie'])
  })
})
