// Accessibility gate: axe-core (WCAG 2.1 A/AA) over every kind of page, the
// overview's views, the graphs, the dialogs, and the phone layout. Any
// violation not exempted, with a reason, in docs/baselines/accessibility.json
// fails the run.
//
//   bun scripts/a11y.ts http://localhost:3000
//
// Uses Chrome (CHROME_PATH, else /usr/bin/google-chrome); exits 2 when no
// browser is available so callers can skip.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, devices } from 'playwright-core'
import type { Page } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:3000'
const root = join(import.meta.dirname, '..')
const axeSource = readFileSync(join(root, 'node_modules/axe-core/axe.min.js'), 'utf8')
const baseline = JSON.parse(readFileSync(join(root, 'docs/baselines/accessibility.json'), 'utf8')) as { exemptions: Array<{ rule: string; match: string[]; reason: string }> }

const PAYLOAD = '320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37'

type Visit = { path: string; then?: (page: Page) => Promise<void> }
/** Opens a dialog, menu or view by the control's name, whatever its role. */
const open = (name: string | RegExp) => async (page: Page) => {
  const control = page.getByRole('button', { name }).or(page.getByRole('radio', { name })).or(page.getByRole('tab', { name })).first()
  await control.click({ timeout: 10_000 })
  await page.waitForTimeout(800)
}

const DESKTOP: Visit[] = [
  { path: '/' },
  { path: '/?view=health' },
  { path: '/?view=threats' },
  { path: '/?view=behavior' },
  { path: '/?view=evidence' },
  { path: '/events' },
  { path: '/sources/198.51.100.13' },
  { path: '/sources/198.51.100.13', then: open('Graph') },
  { path: '/attackers' },
  { path: '/kill-chain' },
  { path: '/campaigns' },
  { path: '/iocs' },
  { path: '/recordings' },
  { path: `/payloads/${PAYLOAD}` },
  { path: `/payloads/${PAYLOAD}`, then: open('Payload report') },
  { path: `/payloads/${PAYLOAD}/ghidra?section=code` },
  { path: `/payloads/${PAYLOAD}/sandbox` },
  { path: '/payload-workbench/results' },
  { path: '/alerts' },
  { path: '/ml-anomalies' },
  { path: '/source-health' },
  { path: '/topology' },
  { path: '/reports/generate' },
  { path: '/reports/history' },
  { path: '/canarytokens' },
  { path: '/events?settings=appearance' },
  { path: '/events?settings=behavior' },
  { path: '/events', then: open('Report a problem') },
  { path: '/auth/login' },
  { path: '/auth/callback?code=expired' },
  { path: '/no-such-page' },
]
const PHONE: Visit[] = [{ path: '/' }, { path: '/events' }, { path: '/', then: open('Open navigation') }]

const executablePath = process.env.CHROME_PATH ?? (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined)
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] }).catch(() => undefined)
if (!browser) {
  console.log('no browser available (set CHROME_PATH); accessibility check skipped')
  process.exit(2)
}

// An exemption names its rule and the substrings every exempted node shows.
const exempt = (rule: string, node: string) => baseline.exemptions.some((e) => e.rule === rule && e.match.every((part) => node.includes(part)))
const findings: string[] = []
let checked = 0
for (const [label, options, visits] of [
  ['desktop', { viewport: { width: 1440, height: 900 } }, DESKTOP],
  ['phone', { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } }, PHONE],
] as const) {
  const context = await browser.newContext(options)
  const page = await context.newPage()
  for (const visit of visits) {
    await page.goto(base + visit.path, { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    if (visit.then) await visit.then(page)
    await page.addScriptTag({ content: axeSource })
    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (context: Document, options: object) => Promise<{ violations: Array<{ id: string; impact: string; help: string; nodes: Array<{ target: string[]; html: string }> }> }> } }).axe
      const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
      return result.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 120)}`) }))
    })
    checked++
    for (const v of violations) {
      const remaining = v.nodes.filter((node) => !exempt(v.id, node))
      if (remaining.length) findings.push(`${label} ${visit.path}${visit.then ? ' (opened)' : ''}: ${v.id} [${v.impact}] ${v.help}\n    ${remaining.slice(0, 3).join('\n    ')}`)
    }
  }
  await context.close()
}
await browser.close()

console.log(`checked ${checked} views against WCAG 2.1 A/AA`)
if (findings.length) {
  console.log(findings.join('\n'))
  process.exit(1)
}
console.log(`no violations (${baseline.exemptions.length} documented exemption${baseline.exemptions.length === 1 ? '' : 's'})`)
