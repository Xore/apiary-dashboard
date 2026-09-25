// Simulated operational incidents: change what source health reports while
// the dashboard is open, so the operational toasts (and every page reading
// health) can be seen raising and resolving. Driven from the Mock data menu.
//
// Browser-tab state, like every other mock write: the tab that simulates
// sees it; a server-rendered reload starts healthy again.
import type { SourceHealth } from '../types'

export type Incident = 'sensor-silent' | 'ingest-delayed' | 'ingest-stalled' | 'cluster-red' | 'pipeline-down' | 'dead-letters'

export const INCIDENTS: Array<{ id: Incident; label: string }> = [
  { id: 'sensor-silent', label: 'A sensor goes silent' },
  { id: 'ingest-delayed', label: 'Ingest falls behind' },
  { id: 'ingest-stalled', label: 'Ingest stalls' },
  { id: 'cluster-red', label: 'Cluster goes red' },
  { id: 'pipeline-down', label: 'Filebeat unreachable' },
  { id: 'dead-letters', label: 'Dead letters arrive' },
]

/** The sensor the "goes silent" incident takes down, in turn. */
const SILENCE_ORDER = ['cowrie', 'multipot', 'conpot-s7-1200', 'sentrypeer']

const state = {
  silent: new Set<string>(),
  ingest: undefined as 'delayed' | 'stale' | undefined,
  clusterRed: false,
  pipelineDown: false,
  extraDeadLetters: 0,
}

export const HEALTH_CHANGED = 'apiary-mock-health-changed'

function changed() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(HEALTH_CHANGED))
}

export function simulate(incident: Incident): void {
  if (incident === 'sensor-silent') {
    const next = SILENCE_ORDER.find((s) => !state.silent.has(s))
    if (next) state.silent.add(next)
  }
  if (incident === 'ingest-delayed') state.ingest = 'delayed'
  if (incident === 'ingest-stalled') state.ingest = 'stale'
  if (incident === 'cluster-red') state.clusterRed = true
  if (incident === 'pipeline-down') state.pipelineDown = true
  if (incident === 'dead-letters') state.extraDeadLetters += 250
  changed()
}

export function resolveAll(): void {
  state.silent.clear()
  state.ingest = undefined
  state.clusterRed = false
  state.pipelineDown = false
  state.extraDeadLetters = 0
  changed()
}

export const silentSensors = (): ReadonlySet<string> => state.silent

export const hasIncident = () => state.silent.size > 0 || state.ingest !== undefined || state.clusterRed || state.pipelineDown || state.extraDeadLetters > 0

/** Source health with the active incidents laid over it. */
export function withIncidents(health: SourceHealth): SourceHealth {
  if (!hasIncident()) return health
  return {
    ...health,
    clusterStatus: state.clusterRed ? 'red' : health.clusterStatus,
    feeds: health.feeds.map((f) => (state.silent.has(f.sensor) ? { ...f, state: 'silent' as const } : f)),
    ingest: state.ingest ? { ...health.ingest, state: state.ingest, ageSeconds: state.ingest === 'stale' ? 3 * 3600 : 20 * 60 } : health.ingest,
    pipeline: state.pipelineDown ? { ...health.pipeline, state: 'stopped' } : health.pipeline,
    deadLetters: health.deadLetters + state.extraDeadLetters,
  }
}
