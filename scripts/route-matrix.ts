// The route part of the source-to-destination inventory (#2): every route
// module of the canonical dashboard (docs/migration/canonical-routes.txt, at
// the pinned commit) and where its behavior lives in the rewrite.
//
//   bun scripts/route-matrix.ts     writes docs/migration/route-matrix.md
//
// src/test/route-matrix.test.ts fails when a canonical route has no row,
// when a destination is not in the route tree, or when the document is
// stale.

export type Status = 'implemented' | 'replaced' | 'pending'

export type Row = {
  /** The canonical route module, as named under src/routes. */
  source: string
  /** Where it lives now: rewrite route paths (the first is the main one). */
  destination: string[]
  status: Status
  note: string
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
  { source: 'auth/login.ts', destination: ['/auth/login'], status: 'implemented', note: `Mock identity provider and the unavailable page; Keycloak PKCE in ${P2} (#5).` },
  { source: 'auth/callback.ts', destination: ['/auth/callback'], status: 'implemented', note: `The three failures production tells apart; the code exchange and Redis session in ${P2} (#5).` },
  { source: 'auth/logout.ts', destination: ['/auth/logout'], status: 'implemented', note: `Mock sign-out; RP-initiated logout and the cross-origin 403 in ${P2} (#5).` },

  // ---- Direct handlers ----------------------------------------------------------
  { source: 'api/artifact.$kind.$key.$filename.ts', destination: ['/api/artifact/$kind/$key/$filename'], status: 'implemented', note: 'Mock files built from the run.' },
  { source: 'api/canarytoken.$id.download.ts', destination: ['/api/canarytoken/$id/download'], status: 'implemented', note: 'Mock token files.' },
  { source: 'api/export.$name.ts', destination: ['/api/export/$name'], status: 'implemented', note: 'Same allowlist; full scope, capped at the export limit.' },
  { source: 'api/payload.$hash.download.ts', destination: ['/api/payload/$hash/download'], status: 'implemented', note: 'Admins only; a harmless stand-in for the live bytes.' },
  { source: 'api/raw-report.$kind.$sha.ts', destination: ['/api/raw-report/$kind/$sha'], status: 'implemented', note: '' },
  { source: 'api/recording.$shasum.$format.ts', destination: ['/api/recording/$shasum/$format'], status: 'implemented', note: 'asciicast v2 and the raw log.' },
  { source: 'api/report.$id.pdf.ts', destination: ['/api/report/$id/pdf'], status: 'implemented', note: 'A real PDF from the report\'s sections.' },
  { source: 'api/chart.$name.ts', destination: [], status: 'pending', note: `Chart payloads come through the data seam on mock data; the session-guarded proxy to the Rust tier is ${P2} (#6).` },
  { source: 'api/live.ts', destination: [], status: 'pending', note: `The live stream is simulated in the browser (src/data/liveStream.ts); the SSE proxy with its admission gate is ${P2} (#6).` },
  { source: 'api/topology.flow.ts', destination: [], status: 'pending', note: `The topology comes through the data seam on mock data; the proxy is ${P2} (#6).` },

  // ---- Infrastructure -------------------------------------------------------------
  { source: 'healthz.ts', destination: ['/healthz'], status: 'implemented', note: 'Unauthenticated, always 200: the Traefik and Docker probe.' },
  { source: 'export.portbridge-manual-blackhole[.]txt.ts', destination: ['/export/portbridge-manual-blackhole.txt'], status: 'implemented', note: 'The firewall puller\'s list, byte for byte; no session, 5xx on outage.' },
  { source: 'metrics.ts', destination: [], status: 'pending', note: `Prometheus baseline behind the service token: ${P2} (#5, #7).` },
  { source: 'bff.$.ts', destination: [], status: 'pending', note: `The tier boundary for a split frontend host: ${P2} (#5).` },
  { source: 'bff-mounted.$.ts', destination: [], status: 'pending', note: `The same seam to backend-service-mounted: ${P2} (#5).` },
]

const LEGEND: Record<Status, string> = {
  implemented: 'the behavior lives at the destination (on mock data; real data per slice in #6)',
  replaced: 'the old path redirects to its new home in the rewrite',
  pending: 'not in the rewrite yet; the note says what stands in and where it is tracked',
}

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
    '| Canonical module | Rewrite | Status | Note |',
    '|---|---|---|---|',
    ...rows.map((r) => `| \`${cell(r.source)}\` | ${r.destination.map((d) => `\`${cell(d)}\``).join('<br>') || '—'} | ${r.status} | ${cell(r.note)} |`),
    '',
    'Server functions, data fields and security owners, the rest of #2, follow in Phase 2.',
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
