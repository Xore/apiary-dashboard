// The route part of the source-to-destination inventory (#2): every route
// module of the canonical dashboard (docs/migration/canonical-routes.txt, at
// the pinned commit) and where its behavior lives in the rewrite.
//
//   bun scripts/route-matrix.ts     writes docs/migration/route-matrix.md
//
// src/test/route-matrix.test.ts fails when a canonical route has no row,
// when a destination is not in the route tree, or when the document is
// stale.

import { sliceOfRoute, sliceRef } from './inventory/slice-map'

export type Status = 'implemented' | 'replaced' | 'pending'

export type Row = {
  /** The canonical route module, as named under src/routes. */
  source: string
  /** Where it lives now: rewrite route paths (the first is the main one). */
  destination: string[]
  status: Status
  note: string
  /** Who enforces the canonical boundary, for a direct handler or auth
   * route; pages are all behind the navigation guard and the function
   * middleware. */
  security?: string
}

const P2 = 'Phase 2'

export const ROWS: Row[] = [
  // ---- Pages ----------------------------------------------------------------
  { source: 'index.tsx', destination: ['/'], status: 'implemented', note: 'Overview with its five views as top-bar tabs.' },
  { source: 'agent-campaigns.tsx', destination: ['/agent-campaigns', '/agent-campaigns/$id'], status: 'implemented', note: 'List, and an entity page per campaign.' },
  { source: 'alerts.tsx', destination: ['/alerts', '/alerts/$key'], status: 'implemented', note: 'New and Acknowledged as tabs; an entity page per alert group.' },
  { source: 'attackers.tsx', destination: ['/attackers', '/identities/$id'], status: 'implemented', note: 'The attacker dossier became the identity entity page.' },
  { source: 'auth-events.tsx', destination: ['/auth-events', '/auth-events/$id'], status: 'implemented', note: '' },
  { source: 'campaigns.tsx', destination: ['/campaigns', '/campaigns/$cidr'], status: 'implemented', note: '' },
  { source: 'canarytokens.tsx', destination: ['/canarytokens', '/canarytokens/$id', '/canarytokens/triggers/$id'], status: 'implemented', note: 'Tokens and fired tokens as tabs; creation as a dialog wizard.' },
  { source: 'cape.index.tsx', destination: ['/cape'], status: 'implemented', note: 'A tab of Analysis results.' },
  { source: 'cape.$sha.tsx', destination: ['/cape/$sha', '/payloads/$hash/cape'], status: 'replaced', note: 'Redirects to the payload page\'s CAPE tab.' },
  { source: 'clusters.tsx', destination: ['/clusters', '/clusters/$kind/$value'], status: 'implemented', note: '' },
  { source: 'commands.tsx', destination: ['/commands'], status: 'implemented', note: 'Under Indicators → Commands → Every execution; server-paged.' },
  { source: 'credentials.tsx', destination: ['/credentials', '/credentials/$id'], status: 'implemented', note: 'Provisioning as a dialog wizard.' },
  { source: 'dead-letters.tsx', destination: ['/dead-letters', '/dead-letters/$id'], status: 'implemented', note: 'A tab of Source & pipeline health.' },
  { source: 'event.$id.tsx', destination: ['/event/$id', '/events/$id'], status: 'replaced', note: 'Redirects to the event entity page.' },
  { source: 'events.tsx', destination: ['/events', '/events/$id'], status: 'implemented', note: 'Server-paged; tool links and exports as in production.' },
  { source: 'ghidra.$sha.tsx', destination: ['/ghidra/$sha', '/payloads/$hash/ghidra'], status: 'replaced', note: 'Redirects to the payload page\'s Ghidra tab.' },
  { source: 'github-analysis.index.tsx', destination: ['/github-analysis'], status: 'implemented', note: 'A tab of Analysis results.' },
  { source: 'github-analysis.$sha.tsx', destination: ['/github-analysis/$sha', '/payloads/$hash/github'], status: 'replaced', note: 'Redirects to the payload page\'s GitHub tab.' },
  { source: 'history.tsx', destination: ['/history'], status: 'implemented', note: 'Server-paged.' },
  { source: 'investigate.cidr.$cidr.tsx', destination: ['/investigate/cidr/$cidr', '/networks/$cidr'], status: 'replaced', note: 'Redirects to the network entity page.' },
  { source: 'investigate.cluster.tsx', destination: ['/investigate/cluster', '/clusters/$kind/$value'], status: 'replaced', note: 'Redirects to the cluster entity page.' },
  { source: 'investigate.ip.$ip.tsx', destination: ['/investigate/ip/$ip', '/sources/$ip'], status: 'replaced', note: 'Redirects to the source entity page.' },
  { source: 'investigate.lookup.tsx', destination: ['/investigate/lookup', '/iocs'], status: 'replaced', note: 'The lookup heads the Indicators hub.' },
  { source: 'ips.tsx', destination: ['/ips', '/sources/$ip'], status: 'implemented', note: '' },
  { source: 'kill-chain.tsx', destination: ['/kill-chain'], status: 'implemented', note: '' },
  { source: 'llm-analysis.tsx', destination: ['/llm-analysis', '/llm-analysis/$id'], status: 'implemented', note: '' },
  { source: 'ml-anomalies.tsx', destination: ['/ml-anomalies', '/ml-anomalies/$id'], status: 'implemented', note: '' },
  { source: 'payload-analysis.$hash.tsx', destination: ['/payload-analysis/$hash', '/payloads/$hash'], status: 'replaced', note: 'Redirects to the payload entity page.' },
  { source: 'payloads.tsx', destination: ['/payloads', '/payloads/$hash'], status: 'implemented', note: '' },
  { source: 'payload-workbench.results.tsx', destination: ['/payload-workbench/results'], status: 'implemented', note: 'Analyzers as top-bar tabs, with the CAPE, GitHub and RevDeck lists and the sandbox live view.' },
  { source: 'problem-reports.tsx', destination: ['/problem-reports', '/problem-reports/$id'], status: 'implemented', note: 'A tab of Source & pipeline health.' },
  { source: 'recordings.tsx', destination: ['/recordings', '/recordings/$shasum'], status: 'implemented', note: '' },
  { source: 'reports.tsx', destination: ['/reports', '/reports/generate', '/reports/history', '/reports/templates', '/reports/library'], status: 'replaced', note: 'The studio split into four pages, one sidebar entry; the old path redirects.' },
  { source: 'revdeck.index.tsx', destination: ['/revdeck'], status: 'implemented', note: 'A tab of Analysis results.' },
  { source: 'revdeck.$sha.tsx', destination: ['/revdeck/$sha', '/payloads/$hash/revdeck'], status: 'replaced', note: 'Redirects to the payload page\'s RevDeck tab.' },
  { source: 'sandbox.$job.tsx', destination: ['/sandbox/$job', '/payloads/$hash/sandbox'], status: 'replaced', note: 'Redirects to the payload page\'s Sandbox tab.' },
  { source: 'sandbox.vnc.tsx', destination: ['/sandbox/vnc'], status: 'implemented', note: 'Under Analysis results → Sandbox → Live view.' },
  { source: 'search.tsx', destination: ['/search'], status: 'implemented', note: 'Also the command palette.' },
  { source: 'sensors.index.tsx', destination: ['/sensors', '/sensors/$sensor'], status: 'replaced', note: 'Opens the busiest sensor\'s page; every sensor is one switch away.' },
  { source: 'sensors.$sensor.tsx', destination: ['/sensors/$sensor'], status: 'implemented', note: '' },
  { source: 'sessions.$id.tsx', destination: ['/sessions/$id'], status: 'implemented', note: '' },
  { source: 'settings.tsx', destination: ['/settings', '/'], status: 'replaced', note: 'The settings dialog (?settings=<pane>) over any page; the old path opens it.' },
  { source: 'source-health.tsx', destination: ['/source-health'], status: 'implemented', note: '' },
  { source: 'topology.tsx', destination: ['/topology'], status: 'implemented', note: '' },
  { source: 'tty-replay.$shasum.tsx', destination: ['/tty-replay/$shasum', '/recordings/$shasum'], status: 'replaced', note: 'Redirects to the recording entity page.' },

  // ---- Sign-in ----------------------------------------------------------------
  { source: 'auth/login.ts', destination: ['/auth/login'], status: 'implemented', note: `Mock identity provider (real sessions) and the unavailable page; Keycloak PKCE in ${P2} (#5).` , security: 'public; PKCE state and verifier kept one-time in Redis; safe `return_to`; the dev bypass only with `OIDC_DISABLED`' },
  { source: 'auth/callback.ts', destination: ['/auth/callback'], status: 'implemented', note: `Creates the session for the mock provider's answer; renders the three failures production tells apart. The code exchange and the Redis store in ${P2} (#5).` , security: 'public; completes the PKCE exchange against the one-time state; provider errors render as pages' },
  { source: 'auth/logout.ts', destination: ['/auth/logout'], status: 'implemented', note: `Destroys the session and clears the cookie, 403 cross-site; Keycloak RP-initiated logout in ${P2} (#5).` , security: 'same-origin `Origin`/`Referer` required (cross-origin 403, #3153); destroys the Redis session, then Keycloak end-session' },

  // ---- Direct handlers ----------------------------------------------------------
  { source: 'api/artifact.$kind.$key.$filename.ts', destination: ['/api/artifact/$kind/$key/$filename'], status: 'implemented', note: 'Mock files built from the run.' , security: 'handler\'s own session check; artifact admission gate' },
  { source: 'api/canarytoken.$id.download.ts', destination: ['/api/canarytoken/$id/download'], status: 'implemented', note: 'Mock token files.' , security: 'handler\'s own session check; admission gate' },
  { source: 'api/export.$name.ts', destination: ['/api/export/$name'], status: 'implemented', note: 'Same allowlist; full scope, capped at the export limit.' , security: 'handler\'s own session check; name allowlist; export admission gate' },
  { source: 'api/payload.$hash.download.ts', destination: ['/api/payload/$hash/download'], status: 'implemented', note: 'Admins only; a harmless stand-in for the live bytes.' , security: 'handler\'s own session check, then admin role; hash validated; payload admission gate' },
  { source: 'api/raw-report.$kind.$sha.ts', destination: ['/api/raw-report/$kind/$sha'], status: 'implemented', note: '' , security: 'handler\'s own session check; kind allowlist; admission gate' },
  { source: 'api/recording.$shasum.$format.ts', destination: ['/api/recording/$shasum/$format'], status: 'implemented', note: 'asciicast v2 and the raw log.' , security: 'handler\'s own session check; shasum and format validated; admission gate' },
  { source: 'api/report.$id.pdf.ts', destination: ['/api/report/$id/pdf'], status: 'implemented', note: 'A real PDF from the report\'s sections.' , security: 'handler\'s own session check; PDF admission gate' },
  { source: 'api/chart.$name.ts', destination: [], status: 'pending', note: `Chart payloads come through the data seam on mock data; the session-guarded proxy to the Rust tier is ${P2} (#6).` , security: 'handler\'s own session check; chart allowlist' },
  { source: 'api/live.ts', destination: [], status: 'pending', note: `The live stream is simulated in the browser (src/data/liveStream.ts); the SSE proxy with its admission gate is ${P2} (#6).` , security: 'handler\'s own session check; stream admission gate (503 when full)' },
  { source: 'api/topology.flow.ts', destination: [], status: 'pending', note: `The topology comes through the data seam on mock data; the proxy is ${P2} (#6).` , security: 'handler\'s own session check' },

  // ---- Infrastructure -------------------------------------------------------------
  { source: 'healthz.ts', destination: ['/healthz'], status: 'implemented', note: 'Unauthenticated, always 200: the Traefik and Docker probe.' , security: 'public by design: the infrastructure probe' },
  { source: 'export.portbridge-manual-blackhole[.]txt.ts', destination: ['/export/portbridge-manual-blackhole.txt'], status: 'implemented', note: 'The firewall puller\'s list, byte for byte; no session, 5xx on outage.' , security: 'no session by design: the WireGuard tunnel is the trust boundary; the backend call carries the service token' },
  { source: 'metrics.ts', destination: [], status: 'pending', note: `Prometheus baseline behind the service token: ${P2} (#5, #7).` , security: 'inbound service token (`x-service-token`); refuses when none is configured' },
  { source: 'bff.$.ts', destination: [], status: 'pending', note: `The tier boundary for a split frontend host: ${P2} (#5).` , security: '`proxyToRust`: serve-mode gate and inbound service token' },
  { source: 'bff-mounted.$.ts', destination: [], status: 'pending', note: `The same seam to backend-service-mounted: ${P2} (#5).` , security: '`proxyToRust`: serve-mode gate and inbound service token' },
]

const LEGEND: Record<Status, string> = {
  implemented: 'the behavior lives at the destination (on mock data; real data per slice in #6)',
  replaced: 'the old path redirects to its new home in the rewrite',
  pending: 'not in the rewrite yet; the note says what stands in and where it is tracked',
}

/** Every page: the root route's navigation guard (session, else sign-in
 * with a safe return path), and its data through server functions behind
 * the global middleware (same-origin, then session). */
const PAGE_SECURITY = 'navigation guard; function middleware'

export function renderMatrix(rows: Row[] = ROWS): string {
  const count = (status: Status) => rows.filter((r) => r.status === status).length
  const cell = (text: string) => text.replace(/\|/g, '\\|')
  const lines = [
    '# Route matrix',
    '',
    'Every route module of the canonical dashboard (`Xore/APIARY@62ee45d`, listed in `canonical-routes.txt`) and where its behavior lives in the rewrite. Generated by `bun scripts/route-matrix.ts`; `src/test/route-matrix.test.ts` keeps it complete and current.',
    '',
    `**${rows.length} routes**: ${count('implemented')} implemented, ${count('replaced')} replaced by a redirect, ${count('pending')} pending.`,
    '',
    ...(['implemented', 'replaced', 'pending'] as const).map((s) => `- **${s}**: ${LEGEND[s]}`),
    '',
    '**Security owner** is who enforces the canonical boundary. Pages rely on the root route\'s navigation guard and on the global function middleware (same-origin, then session) for their data; direct handlers do not pass through either, so each names its own.',
    '',
    '| Canonical module | Rewrite | Status | Note | Security owner | Slice |',
    '|---|---|---|---|---|---|',
    ...rows.map((r) => `| \`${cell(r.source)}\` | ${r.destination.map((d) => `\`${cell(d)}\``).join('<br>') || '—'} | ${r.status} | ${cell(r.note)} | ${cell(r.security ?? PAGE_SECURITY)} | ${sliceRef(sliceOfRoute(r.source))} |`),
    '',
    'Each row links its Phase 2 slice (`slices.md`). Server functions with their permissions and data fields: `server-functions.md`; per-route data, mutations and states: `routes.md`; the shell: `shell.md`.',
    '',
  ]
  return lines.join('\n')
}

if (import.meta.main) {
  const { writeFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  writeFileSync(join(import.meta.dirname, '..', 'docs/migration/route-matrix.md'), renderMatrix())
  console.log(`docs/migration/route-matrix.md: ${ROWS.length} routes`)
}
