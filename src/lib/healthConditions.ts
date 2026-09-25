// What is operationally wrong, read from source health, and what changed
// between two readings: the logic behind the operational toasts.
import type { SourceHealth } from '#/data/types'

export type Severity = 'warning' | 'danger' | 'success'
export type Condition = { key: string; message: string; severity: Severity; to: string }

/** What is wrong right now, according to source health. */
export function conditionsFrom(health: SourceHealth): Condition[] {
  const conditions: Condition[] = []
  for (const feed of health.feeds) {
    if (feed.state === 'silent') conditions.push({ key: `sensor:${feed.sensor}`, message: `${feed.sensor} stopped reporting`, severity: 'warning', to: '/source-health' })
  }
  if (health.ingest.state === 'stale' || health.ingest.state === 'silent') conditions.push({ key: 'ingest', message: 'Ingestion has stalled: no new events are being indexed', severity: 'danger', to: '/source-health' })
  else if (health.ingest.state === 'delayed') conditions.push({ key: 'ingest', message: 'Ingestion is falling behind', severity: 'warning', to: '/source-health' })
  // Red only: yellow is the steady state of a single-node cluster.
  if (health.clusterStatus === 'red') conditions.push({ key: 'cluster', message: 'Elasticsearch cluster is red: shards are unavailable', severity: 'danger', to: '/source-health' })
  if (health.pipeline.state === 'stopped') conditions.push({ key: 'pipeline', message: 'Filebeat is unreachable', severity: 'danger', to: '/source-health' })
  if (health.deadLetters > 0) conditions.push({ key: 'dead-letters', message: `${health.deadLetters} documents rejected by Elasticsearch`, severity: 'warning', to: '/dead-letters' })
  return conditions
}

/** What changed between two observations. A condition that changes
 * severity (behind → stalled) is news again; one that persists is not. A
 * count that only grows (dead letters) keeps its key and stays quiet. */
export function transitions(previous: ReadonlyMap<string, Condition>, current: Condition[]): { raised: Condition[]; cleared: Condition[] } {
  const now = new Map(current.map((c) => [c.key, c]))
  return {
    raised: current.filter((c) => previous.get(c.key)?.severity !== c.severity),
    cleared: [...previous.values()].filter((c) => !now.has(c.key)),
  }
}
