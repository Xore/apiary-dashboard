// SSR link crawl (epic #25): walks every page reachable from / plus a few ids
// of each entity kind, opens every tab of each entity page it meets, and fails
// on any link that answers 4xx/5xx. Tabs are buttons, not links, so their
// routes are derived from the route files: `sources.$ip.timeline.tsx` means
// every /sources/<ip> page has a /timeline tab.
//
//   bun scripts/crawl.ts http://localhost:3000 [maxPerShape] [--scenarios]
//
// With --scenarios it then opens one page of every route shape under each
// mock scenario (?mock=…) and checks the page says the right thing: empty
// and viewer pages render without an error, outages show their own error
// state, and nothing anywhere falls through to the generic crash state.
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import * as q from '../src/data/queries'

const base = process.argv[2] ?? 'http://localhost:3000'
const maxPerShape = Number(process.argv[3] ?? 3)
const withScenarios = process.argv.includes('--scenarios')
const enc = encodeURIComponent

// "<prefix>|<param count>" → tab segments, from src/routes/_layout.
const tabs = new Map<string, string[]>()
for (const file of readdirSync(join(import.meta.dir, '../src/routes/_layout'))) {
  const parts = file.replace(/\.tsx$/, '').split('.')
  const params = parts.filter((p) => p.startsWith('$')).length
  const last = parts.at(-1)!
  if (!params || last.startsWith('$') || last === 'index' || parts.length < 3) continue
  const key = `${parts[0]}|${params}`
  tabs.set(key, [...(tabs.get(key) ?? []), last])
}

async function seeds(): Promise<string[]> {
  const take = <T>(items: T[], n = 2) => items.slice(0, n)
  const [alerts, ml, llm, agent, auth, canary, creds, dead, problems, reports, recordings, catalog] = await Promise.all([
    q.getAlerts(),
    q.getMlAnomalies(),
    q.getLlmAnalyses(),
    q.getAgentCampaigns(),
    q.getAuthEvents(),
    q.getCanarytokens(),
    q.getCredentials(),
    q.getDeadLetters(''),
    q.getProblemReports(),
    q.getReports(),
    q.getRecordings(),
    q.getIocCatalog(),
  ])
  return [
    ...take(alerts).map((g) => `/alerts/${enc(q.alertKeyOf(g))}`),
    ...take(ml.anomalies).map((a) => `/ml-anomalies/${enc(a.id)}`),
    ...take(llm).map((a) => `/llm-analysis/${enc(a.id)}`),
    ...take(agent).map((c) => `/agent-campaigns/${enc(c.id)}`),
    ...take(auth.events).map((e) => `/auth-events/${enc(e.id)}`),
    ...take(canary.tokens).map((t) => `/canarytokens/${enc(t.id)}`),
    ...take(canary.triggers).map((t) => `/canarytokens/triggers/${enc(t.id)}`),
    ...take(creds.credentials).map((c) => `/credentials/${enc(c.id)}`),
    ...take(dead).map((d) => `/dead-letters/${enc(d.id)}`),
    ...take(problems).map((r) => `/problem-reports/${enc(r.id)}`),
    ...take(reports.definitions).map((d) => `/reports/definitions/${enc(d.id)}`),
    ...take(reports.generated).map((g) => `/reports/generated/${enc(g.id)}`),
    ...take(recordings).map((r) => `/recordings/${r.shasum}`),
    '/iocs',
    '/watchlist',
    ...Object.entries(catalog).flatMap(([kind, rows]) => [`/iocs?kind=${kind}`, ...take(rows).filter(() => kind !== 'hash').map((row) => `/ioc/${kind}/${enc(row.value)}`)]),
  ]
}

/** Collapses ids so a few instances of each route pattern are visited. */
const shape = (path: string) =>
  path
    .split('?')[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, ':uuid')
    .replace(/[0-9a-f]{10,}/g, ':h')
    .replace(/\d+\.\d+\.\d+\.\d+(%2F\d+)?/g, ':ip')
    .replace(/\/(ioc\/[^/]+|alerts|clusters\/[^/]+)\/[^/]+/, '/$1/:v')

const seen = new Set<string>()
const perShape = new Map<string, number>()
const broken: string[] = []
/** One rendered page per route shape, for the scenario pass. */
const samples = new Map<string, string>()
const queue = ['/', ...(await seeds())]
let fetched = 0

while (queue.length) {
  const path = queue.shift()!
  if (seen.has(path)) continue
  seen.add(path)
  const key = shape(path)
  if ((perShape.get(key) ?? 0) >= maxPerShape) continue
  perShape.set(key, (perShape.get(key) ?? 0) + 1)
  const res = await fetch(base + path, { redirect: 'manual' })
  fetched++
  if (res.status >= 400) {
    broken.push(`${res.status} ${path}`)
    continue
  }
  if (res.status >= 300) {
    const location = res.headers.get('location')
    if (location) queue.push(new URL(location, base).pathname)
    continue
  }
  const html = await res.text()
  if (!samples.has(key)) samples.set(key, path)
  for (const match of html.matchAll(/href="(\/[^"#]*)"/g)) {
    const href = match[1].replaceAll('&amp;', '&')
    if (/^\/(assets|@[\w-]+|node_modules|src)\//.test(href) || href.split('?')[0].endsWith('.css')) continue
    queue.push(href)
  }
  // Every tab of an entity page, from its base path.
  const segments = path.split('?')[0].split('/').filter(Boolean)
  const entityTabs = tabs.get(`${segments[0]}|${segments.length - 1}`)
  if (entityTabs) for (const tab of entityTabs) queue.push(`${path.split('?')[0]}/${tab}`)
}

console.log(`crawled ${fetched} pages across ${perShape.size} route shapes`)

// Titles the error boundary shows (DefaultCatchBoundary), by failure kind.
const BOUNDARY = {
  unavailable: 'The backend did not answer',
  overloaded: 'The backend is busy',
  expired: 'Your session expired',
  forbidden: 'Not available to your role',
  crash: 'This page failed to load',
} as const
const shown = (html: string) => (Object.keys(BOUNDARY) as Array<keyof typeof BOUNDARY>).filter((k) => html.includes(BOUNDARY[k]))

if (withScenarios) {
  // What each scenario may show; anything else is a finding.
  const allowed: Record<string, Array<keyof typeof BOUNDARY | 'page'>> = {
    empty: ['page'],
    large: ['page'],
    viewer: ['page'],
    partial: ['page', 'unavailable'],
    unavailable: ['unavailable'],
    overloaded: ['overloaded'],
    expired: ['expired'],
  }
  // Pages kept in the browser alone: an outage does not reach them.
  const noBackend = new Set(['/watchlist'])
  let checked = 0
  for (const [scenario, ok] of Object.entries(allowed)) {
    for (const path of samples.values()) {
      if (noBackend.has(path) && !ok.includes('page')) continue
      const url = `${base}${path}${path.includes('?') ? '&' : '?'}mock=${scenario}`
      const res = await fetch(url, { redirect: 'manual' })
      checked++
      if (res.status >= 300 && res.status < 500) continue // a redirect or not-found is a page's own answer
      // A failed loader answers 5xx with the error state rendered; read it.
      const states = shown(await res.text())
      const got = states.length ? states : [res.status >= 500 ? ('crash' as const) : ('page' as const)]
      if (!got.every((state) => ok.includes(state))) broken.push(`${scenario}: shows ${got.join('+')} (${res.status}) on ${path}`)
    }
  }
  console.log(`checked ${checked} pages across ${Object.keys(allowed).length} mock scenarios`)
}
if (broken.length) {
  console.log(broken.join('\n'))
  process.exit(1)
}
console.log('no broken links')
