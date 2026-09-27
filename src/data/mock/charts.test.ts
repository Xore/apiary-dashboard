// The mock /api/v1/charts and topology flow: every allowlisted chart builds
// in its wire shape, and the scenarios reach them like any read.
import { describe, expect, it } from 'vitest'
import { backend } from '../backend'
import { CHART_NAMES } from '../contracts/charts'
import { ATTACKERS } from './investigate'
import { chartPayload, topologyFlow } from './charts'

const none = new URLSearchParams()
const isBar = (v: unknown) => {
  const bar = v as { categories: unknown[]; values: unknown[] }
  return Array.isArray(bar.categories) && Array.isArray(bar.values) && bar.categories.length === bar.values.length
}
const isSeriesList = (v: unknown) => Array.isArray(v) && v.every((s: { name: unknown; points: Array<{ time: unknown; value: unknown }> }) => typeof s.name === 'string' && s.points.every((p) => typeof p.time === 'string' && typeof p.value === 'number'))

describe('chart payloads', () => {
  it('builds every allowlisted chart with data in it', async () => {
    const q = backend()
    const multi = ATTACKERS.find((a) => a.ips.length > 1)!
    for (const name of CHART_NAMES) {
      const data = await chartPayload(name, q, name === 'attacker-fusion' ? new URLSearchParams({ id: multi.id }) : none)
      expect(data, name).not.toBeNull()
      expect(JSON.stringify(data).length, name).toBeGreaterThan(20)
      if (name.endsWith('-fingerprints') || ['dionaea-cves', 'ics-functions', 'decoy-requests', 'endlessh-held-histogram', 'attacker-fusion'].includes(name)) expect(isBar(data), name).toBe(true)
      if (['ml-backlog', 'netflow-bytes', 'netflow-packets', 'anomaly-trend', 'ml-anomaly-scores'].includes(name)) expect(isSeriesList(data), name).toBe(true)
    }
  })

  it('links the sankey and the ATT&CK grid by what they name', async () => {
    const q = backend()
    const sankey = await chartPayload('kill-chain-sankey', q, none)
    const names = new Set(sankey!.nodes.map((n) => n.name))
    for (const link of sankey!.links) expect(names.has(link.source) && names.has(link.target)).toBe(true)
    const grid = await chartPayload('attck-coverage', q, none)
    for (const cell of grid!.cells) {
      expect(grid!.tactics[cell.tactic_idx]).toBeDefined()
      expect(grid!.techniques[cell.technique_idx]).toBeDefined()
    }
  })

  it('has no fusion without an identity, as the Rust tier refuses one', async () => {
    expect(await chartPayload('attacker-fusion', backend(), none)).toBeNull()
  })

  it('answers empty and failing backends like every read', async () => {
    expect(await chartPayload('os-distribution', backend('empty'), none)).toEqual([])
    await expect(chartPayload('os-distribution', backend('unavailable'), none)).rejects.toMatchObject({ status: 502 })
  })
})

describe('topology flow', () => {
  it('puts every node one layer past what feeds it', async () => {
    const flow = await topologyFlow(backend())
    const layer = new Map(flow.nodes.map((n) => [n.name, n.layer]))
    expect(flow.links.length).toBeGreaterThan(0)
    for (const link of flow.links) expect(layer.get(link.target)!).toBeGreaterThan(layer.get(link.source)!)
  })
})
