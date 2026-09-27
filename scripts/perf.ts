// Performance baseline, measured on the production build: per kind of page,
// the server-rendered HTML, the JavaScript and CSS it loads, how many
// requests, and the load timings. Sizes are gated: a page may not grow past
// its baseline in docs/baselines/performance.json by more than a quarter.
// Timings are recorded for trend but not gated; they follow the machine.
//
//   bun scripts/perf.ts http://localhost:3000            check
//   bun scripts/perf.ts http://localhost:3000 --update   record a new baseline
//
// Uses Chrome (CHROME_PATH, else /usr/bin/google-chrome); exits 2 when no
// browser is available so callers can skip.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { signInContext } from './lib/signIn'

const base = process.argv[2] ?? 'http://localhost:3000'
const update = process.argv.includes('--update')
const file = join(import.meta.dirname, '..', 'docs/baselines/performance.json')
const GROWTH = 1.25

const PAGES = [
  '/',
  '/events',
  '/sources/198.51.100.13',
  '/payloads/320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37',
  '/payloads/320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37/ghidra?section=code',
  '/kill-chain',
  '/alerts',
  '/reports/generate',
  '/source-health',
  '/auth/login',
]

type Measure = { htmlKb: number; jsKb: number; cssKb: number; requests: number; domContentLoadedMs: number; loadMs: number }

const executablePath = process.env.CHROME_PATH ?? (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined)
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] }).catch(() => undefined)
if (!browser) {
  console.log('no browser available (set CHROME_PATH); performance check skipped')
  process.exit(2)
}

const measured: Record<string, Measure> = {}
for (const path of PAGES) {
  // A fresh context per page: a cold load, nothing cached.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await signInContext(context, base)
  const page = await context.newPage()
  // The sign-in visit cached the app's assets; measure a cold load anyway.
  await (await context.newCDPSession(page)).send('Network.setCacheDisabled', { cacheDisabled: true })
  await page.goto(base + path, { waitUntil: 'load' })
  await page.waitForTimeout(500)
  measured[path] = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const size = (r: PerformanceResourceTiming) => r.encodedBodySize || r.transferSize
    const sum = (test: (r: PerformanceResourceTiming) => boolean) => resources.filter(test).reduce((total, r) => total + size(r), 0)
    const kb = (bytes: number) => Math.round(bytes / 102.4) / 10
    return {
      htmlKb: kb(nav.encodedBodySize || nav.transferSize),
      jsKb: kb(sum((r) => r.initiatorType === 'script' || /\.m?js(\?|$)/.test(r.name))),
      cssKb: kb(sum((r) => /\.css(\?|$)/.test(r.name))),
      requests: resources.length + 1,
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
      loadMs: Math.round(nav.loadEventEnd),
    }
  })
  await context.close()
}
await browser.close()

console.log('page'.padEnd(34), 'html KB', 'js KB', 'css KB', 'req', 'DCL ms', 'load ms')
for (const [path, m] of Object.entries(measured)) console.log(path.slice(0, 33).padEnd(34), String(m.htmlKb).padStart(7), String(m.jsKb).padStart(5), String(m.cssKb).padStart(6), String(m.requests).padStart(3), String(m.domContentLoadedMs).padStart(6), String(m.loadMs).padStart(7))

if (update) {
  writeFileSync(file, `${JSON.stringify({ measuredOn: 'production build, cold load, 1440x900', growthAllowed: GROWTH, pages: measured }, null, 2)}\n`)
  console.log(`baseline written to docs/baselines/performance.json`)
  process.exit(0)
}

const baseline = JSON.parse(readFileSync(file, 'utf8')) as { pages: Record<string, Measure> }
const findings: string[] = []
for (const [path, m] of Object.entries(measured)) {
  const was = baseline.pages[path] as Measure | undefined
  if (!was) continue
  for (const key of ['htmlKb', 'jsKb', 'cssKb'] as const) {
    if (m[key] > Math.max(was[key] * GROWTH, was[key] + 5)) findings.push(`${path}: ${key} ${m[key]} > baseline ${was[key]} (+${Math.round((GROWTH - 1) * 100)} %)`)
  }
}
if (findings.length) {
  console.log(findings.join('\n'))
  process.exit(1)
}
console.log(`every page within ${Math.round((GROWTH - 1) * 100)} % of its size baseline`)
