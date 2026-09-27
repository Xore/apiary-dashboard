// The mock backend's /api/v1/charts/{name} and /api/v1/topology flow: the
// Rust tier's wire shapes (src/data/contracts/charts.ts), built from the
// same mock data the pages read, through the backend `q` so the scenario
// (outage, empty, slow, viewer) reaches them as it reaches every read.
import type { Backend } from '../backend'
import type { AttckGrid, Bar, ChartName, Charts, FlowGraph, PiePoint, SankeyData, Series, TimelineRow } from '../contracts/charts'
import type { CountRow, SeriesPoint } from '../types'

const toSeries = (points: SeriesPoint[]): Series[] => {
  const names = [...new Set(points.flatMap((p) => Object.keys(p).filter((k) => k !== 'time')))].sort()
  return names.map((name) => ({ name, points: points.map((p) => ({ time: p.time, value: Number(p[name] ?? 0) })) }))
}
const toBar = (rows: CountRow[]): Bar => ({ categories: rows.map((r) => r.label), values: rows.map((r) => r.count) })
const toPie = (rows: CountRow[]): PiePoint[] => rows.map((r) => ({ name: r.label, value: r.count }))

/** The index-linked flow the pages draw, as the name-linked graph the Rust
 * tier sends. */
function byName(flow: { nodes: Array<{ name: string }>; links: Array<{ source: number; target: number; value: number }> }) {
  return flow.links.flatMap((l) => {
    const source = flow.nodes[l.source] as { name: string } | undefined
    const target = flow.nodes[l.target] as { name: string } | undefined
    return source && target ? [{ source: source.name, target: target.name, value: l.value }] : []
  })
}

/** Topology layers: a node sits one past the deepest node feeding it. */
function layered(names: string[], links: Array<{ source: string; target: string }>): FlowGraph {
  const layer = new Map(names.map((n) => [n, 0]))
  // Longest path by relaxation; a cycle stops after one pass per node.
  let moved = true
  for (let pass = 0; moved && pass < names.length; pass++) {
    moved = false
    for (const l of links) {
      const next = (layer.get(l.source) ?? 0) + 1
      if (next > (layer.get(l.target) ?? 0)) {
        layer.set(l.target, next)
        moved = true
      }
    }
  }
  return { nodes: names.map((name) => ({ name, layer: layer.get(name) ?? 0 })), links: links.map(({ source, target }) => ({ source, target })) }
}

type Builders = { [K in ChartName]: (q: Backend, search: URLSearchParams) => Promise<Charts[K] | null> }

const views = (q: Backend) => q.getOverviewViews()

const CHARTS: Builders = {
  'kill-chain-sankey': async (q): Promise<SankeyData> => {
    const { flow } = await q.getKillChain()
    return { nodes: flow.nodes.map(({ name }) => ({ name })), links: byName(flow) }
  },
  'attck-coverage': async (q): Promise<AttckGrid> => {
    const { coverage, tactics } = await q.getKillChain()
    const techniques = [...new Set(coverage.map((c) => c.technique))]
    return {
      tactics,
      techniques,
      cells: coverage.filter((c) => tactics.includes(c.tactic)).map((c) => ({ tactic_idx: tactics.indexOf(c.tactic), technique_idx: techniques.indexOf(c.technique), count: c.events })),
    }
  },
  'campaign-timeline': async (q): Promise<TimelineRow[]> => {
    const { timeline } = await q.getKillChain()
    const most = Math.max(1, ...timeline.map((t) => t.events))
    return timeline.map((t) => ({ cidr: t.cidr, start_ms: Date.parse(t.first), end_ms: Date.parse(t.last), score: Math.round((t.events / most) * 100) / 100, events: t.events }))
  },
  'ml-backlog': async (q) => toSeries((await views(q)).mlBacklog),
  'netflow-bytes': async (q) => toSeries((await views(q)).netflowBytes),
  'netflow-packets': async (q) => toSeries((await views(q)).netflowPackets),
  'anomaly-trend': async (q) => toSeries((await views(q)).conformance),
  'dionaea-cves': async (q) => toBar((await views(q)).cves),
  'os-distribution': async (q) => toPie((await views(q)).osDistribution),
  'tcp-stack-clusters': async (q) => toPie((await views(q)).tcpClusters),
  'ics-functions': async (q) => toBar((await views(q)).icsFunctions),
  'decoy-requests': async (q) => toBar((await views(q)).decoyRequests),
  'decoy-client-fingerprints': async (q) => toBar((await views(q)).decoyClients),
  'ja4h-fingerprints': async (q) => toBar((await views(q)).ja4h),
  'ja4x-fingerprints': async (q) => toBar((await views(q)).ja4x),
  'ja4l-fingerprints': async (q) => toBar((await views(q)).ja4l),
  'tls-fingerprints': async (q) => toBar((await views(q)).tls),
  'ssh-fingerprints': async (q) => toBar((await views(q)).ssh),
  'endlessh-held-histogram': async (q) => toBar((await views(q)).endlessh),
  'ml-anomaly-scores': async (q): Promise<Series[]> => {
    // Newest 500, as the Rust tier reads them; one series per score.
    const recent = (await q.getMlAnomalies()).anomalies.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 500).reverse()
    const score = { composite: (a: (typeof recent)[number]) => a.compositeScore, hbos: (a: (typeof recent)[number]) => a.modelScores.hbos, isolation_forest: (a: (typeof recent)[number]) => a.modelScores.isolationForest, lstm_ae: (a: (typeof recent)[number]) => a.modelScores.lstmAe }
    return Object.entries(score).map(([name, of]) => ({ name, points: recent.map((a) => ({ time: a.timestamp, value: of(a) })) }))
  },
  // Without ?id= the Rust tier's extractor refuses the request: no payload.
  'attacker-fusion': async (q, search) => {
    const id = search.get('id')
    return id ? q.getIdentityFusion(id) : null
  },
}

/** One chart's payload, or null where the Rust tier answers with an error
 * (the proxy turns that into 502, as canonical's does). */
export function chartPayload<TName extends ChartName>(name: TName, q: Backend, search: URLSearchParams): Promise<Charts[TName] | null> {
  return CHARTS[name](q, search)
}

/** The topology's flow slice, as `/api/topology/flow` forwards it. */
export async function topologyFlow(q: Backend): Promise<FlowGraph> {
  const { flow } = await q.getTopology()
  return layered(
    flow.nodes.map((n) => n.name),
    byName(flow),
  )
}
