// Which Phase 2 slice (#6) each canonical route and server function belongs
// to, and the issue that tracks it. Shared by every inventory generator so
// each document names its rows' slice. No imports beyond types: the route
// matrix and the generators all read it.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RouteInventory } from './routes'
import type { ServerFn } from './server-functions'

export type Slice = { key: string; title: string; workflow: string; routes: string[] }

export const SLICES: Slice[] = [
  { key: 'monitor', title: 'Monitor: overview, ML anomalies, LLM analysis, agent campaigns, auth failures', workflow: 'What is happening across the fleet right now, and what the models flagged.', routes: ['index.tsx', 'ml-anomalies.tsx', 'llm-analysis.tsx', 'agent-campaigns.tsx', 'auth-events.tsx'] },
  { key: 'events', title: 'Events and sessions: explorer, event and session detail, history, commands, search, recordings', workflow: 'Following one event, session or search to everything around it.', routes: ['events.tsx', 'event.$id.tsx', 'sessions.$id.tsx', 'history.tsx', 'commands.tsx', 'search.tsx', 'recordings.tsx', 'tty-replay.$shasum.tsx'] },
  { key: 'sources', title: 'Sources and correlation: attack sources, IP profile, networks, clusters, campaigns, identities, kill chain', workflow: 'Who is attacking, and how their infrastructure and behavior connect.', routes: ['ips.tsx', 'investigate.ip.$ip.tsx', 'investigate.cidr.$cidr.tsx', 'investigate.cluster.tsx', 'investigate.lookup.tsx', 'campaigns.tsx', 'clusters.tsx', 'attackers.tsx', 'kill-chain.tsx'] },
  { key: 'operations', title: 'Operations: alerts, source health, topology, sensors, dead letters, problem reports', workflow: 'Is the platform healthy, and what needs an operator.', routes: ['alerts.tsx', 'source-health.tsx', 'topology.tsx', 'sensors.index.tsx', 'sensors.$sensor.tsx', 'dead-letters.tsx', 'problem-reports.tsx'] },
  { key: 'evidence', title: 'Evidence and analysis: payloads, analysis results, sandbox, Ghidra, CAPE, GitHub analysis, RevDeck', workflow: 'What a captured file is and does, and running analyses on it.', routes: ['payloads.tsx', 'payload-analysis.$hash.tsx', 'payload-workbench.results.tsx', 'sandbox.$job.tsx', 'sandbox.vnc.tsx', 'ghidra.$sha.tsx', 'cape.index.tsx', 'cape.$sha.tsx', 'github-analysis.index.tsx', 'github-analysis.$sha.tsx', 'revdeck.index.tsx', 'revdeck.$sha.tsx'] },
  { key: 'reports', title: 'Reports studio: definitions, generation, history, PDFs', workflow: 'Producing and keeping reports.', routes: ['reports.tsx', 'api/report.$id.pdf.ts'] },
  { key: 'tools', title: 'Tools: canarytokens and bait credentials', workflow: 'Planting and watching deception.', routes: ['canarytokens.tsx', 'credentials.tsx', 'api/canarytoken.$id.download.ts'] },
  { key: 'shell', title: 'Settings, preferences and shell data', workflow: 'The shell every page shares: configuration, preferences, palette search, alerts count, problem reports.', routes: ['settings.tsx'] },
  { key: 'streams', title: 'Live stream, chart and topology proxies', workflow: 'The session-guarded streams and chart payloads pages read directly.', routes: ['api/live.ts', 'api/chart.$name.ts', 'api/topology.flow.ts'] },
  { key: 'downloads', title: 'Downloads, exports and infrastructure endpoints', workflow: 'Files the dashboard hands over, and the endpoints infrastructure calls.', routes: ['api/artifact.$kind.$key.$filename.ts', 'api/export.$name.ts', 'api/payload.$hash.download.ts', 'api/raw-report.$kind.$sha.ts', 'api/recording.$shasum.$format.ts', 'export.portbridge-manual-blackhole[.]txt.ts', 'healthz.ts'] },
  { key: 'security', title: 'Security and authentication (existing issue)', workflow: 'Sign-in, sessions, the BFF seams and metrics.', routes: ['auth/login.ts', 'auth/callback.ts', 'auth/logout.ts', 'bff.$.ts', 'bff-mounted.$.ts', 'metrics.ts'] },
]

const dir = join(import.meta.dirname, '..', '..', 'docs/migration')

/** Issue per slice; the security slice is the existing #5. */
export function issueNumbers(): Record<string, number> {
  const path = join(dir, 'slices.json')
  return { security: 5, ...(existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, number>) : {}) }
}

export const sliceOfRoute = (route: string) => SLICES.find((s) => s.routes.includes(route))?.key

/** A function's slice: the one slice whose routes use it, else the shell. */
export function sliceOfFn(fn: ServerFn, routes: RouteInventory[]): string {
  const using = new Set(routes.filter((r) => r.reads.some((x) => `src/${x.fn}` === fn.id) || r.mutations.some((x) => `src/${x.fn}` === fn.id)).map((r) => sliceOfRoute(r.route)))
  // Session resolution before sign-in is the security layer's (#5).
  if (fn.file === 'src/lib/auth.ts') return 'security'
  const own = fn.file.startsWith('src/routes/') ? sliceOfRoute(fn.file.replace('src/routes/', '')) : undefined
  if (own) return own
  return using.size === 1 ? [...using][0]! : 'shell'
}

/** "#74"-style reference to a slice's issue, or an em dash. */
export const sliceRef = (key: string | undefined) => {
  const number = key ? issueNumbers()[key] : undefined
  return number ? `#${number}` : '—'
}
