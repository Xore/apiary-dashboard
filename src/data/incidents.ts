// The operational incidents the Mock data menu can simulate, as the page
// knows them. Client-safe; the simulation itself is mock-backend state
// (src/data/mock/incidents.ts), changed through the simulateIncident and
// resolveIncidents queries.

export type Incident = 'sensor-silent' | 'ingest-delayed' | 'ingest-stalled' | 'cluster-red' | 'pipeline-down' | 'dead-letters'

export const INCIDENTS: Array<{ id: Incident; label: string }> = [
  { id: 'sensor-silent', label: 'A sensor goes silent' },
  { id: 'ingest-delayed', label: 'Ingest falls behind' },
  { id: 'ingest-stalled', label: 'Ingest stalls' },
  { id: 'cluster-red', label: 'Cluster goes red' },
  { id: 'pipeline-down', label: 'Filebeat unreachable' },
  { id: 'dead-letters', label: 'Dead letters arrive' },
]

/** Fired in the page when source health changed (a simulated incident, or
 * the live stream saying so), so health readers fetch it again. */
export const HEALTH_CHANGED = 'apiary-mock-health-changed'
