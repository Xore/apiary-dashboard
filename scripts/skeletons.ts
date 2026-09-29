// Every page loads skeleton first, in a browser, on a full load: with the
// slow mock backend each page must paint its own layout (its title and
// skeleton placeholders) before any data arrives, then replace every
// placeholder with the data, without an error. One page per route shape,
// from the crawl (scripts/crawl.ts --samples-out).
//
//   bun scripts/skeletons.ts http://localhost:3000 samples.json
//
// Uses Chrome (CHROME_PATH, else /usr/bin/google-chrome); exits 2 when no
// browser is available so callers can skip.
import { existsSync, readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import type { Browser, BrowserContext } from 'playwright-core'
import { signInContext } from './lib/signIn'

const base = process.argv[2] ?? 'http://localhost:3000'
const samples: string[] = JSON.parse(readFileSync(process.argv[3] ?? 'samples.json', 'utf8'))

// Pages that are not the dashboard's own, or have no data to wait for.
const SKIP = /^\/(api|auth|export)\//
// The slow scenario holds every backend answer this long; the skeleton must
// be on screen well before it, and gone some time after.
const FIRST_PAINT_MS = 2000
const LOADED_MS = 12000
// A skeleton placeholder: Astryx's Skeleton, or a region marked busy.
const SKELETON = '[class*="skeleton" i], [aria-busy="true"]'
const ERROR_TITLES = ['The backend did not answer', 'The backend is busy', 'Your session expired', 'This page failed to load']

async function launch(): Promise<Browser | undefined> {
  const executablePath = process.env.CHROME_PATH ?? (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined)
  try {
    return await chromium.launch({ executablePath, args: ['--no-sandbox'] })
  } catch {
    return undefined
  }
}

const browser = await launch()
if (!browser) {
  console.log('no browser available (set CHROME_PATH); skeleton check skipped')
  process.exit(2)
}

const withMock = (path: string, scenario: string) => `${base}${path}${path.includes('?') ? '&' : '?'}mock=${scenario}`

async function signedIn(): Promise<BrowserContext> {
  const context = await browser!.newContext({ viewport: { width: 1440, height: 900 } })
  await signInContext(context, base)
  // A first visit refreshes once to learn the browser's time zone; start
  // from a browser that has been here before.
  const page = await context.newPage()
  await page.goto(`${base}/events`, { waitUntil: 'load' })
  await page.waitForTimeout(2500)
  await page.close()
  return context
}

const findings: string[] = []
// One page per route, whatever its id: /sensors/galah/exposure and
// /sensors/tanner/exposure load the same way.
const routeOf = (path: string) => {
  const segments = path.split('?')[0].split('/')
  return segments.map((segment, i) => (i === 2 && segments.length > 2 && segment ? ':id' : segment)).join('/')
}
const byRoute = new Map<string, string>()
for (const path of samples) if (!SKIP.test(path) && !byRoute.has(routeOf(path))) byRoute.set(routeOf(path), path)
const pages = [...byRoute.values()]

async function check(context: BrowserContext, path: string) {
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)))
  const started = Date.now()
  await page.goto(withMock(path, 'slow'), { waitUntil: 'commit' })
  try {
    await page.locator('h1').first().waitFor({ timeout: FIRST_PAINT_MS })
  } catch {
    findings.push(`${path}: no page title within ${FIRST_PAINT_MS} ms`)
    await page.close()
    return
  }
  const skeleton = await page.locator(SKELETON).count()
  const firstPaint = Date.now() - started
  if (skeleton === 0) findings.push(`${path}: first paint (${firstPaint} ms) shows no skeleton`)
  try {
    await page.waitForFunction((selector) => document.querySelectorAll(selector).length === 0, SKELETON, { timeout: LOADED_MS })
  } catch {
    findings.push(`${path}: skeleton still showing after ${LOADED_MS} ms`)
  }
  const text = await page.locator('main, body').first().innerText()
  for (const title of ERROR_TITLES) if (text.includes(title)) findings.push(`${path}: shows "${title}"`)
  for (const error of errors) findings.push(`${path}: ${error}`)
  await page.close()
}

const context = await signedIn()
const queue = [...pages]
await Promise.all(
  Array.from({ length: Number(process.env.PARALLEL ?? 2) }, async () => {
    for (let path = queue.shift(); path; path = queue.shift()) await check(context, path)
  }),
)

// A missing entity is the page's own answer, in the browser too.
{
  const page = await context.newPage()
  await page.goto(`${base}/sources/10.0.0.1`, { waitUntil: 'load' })
  await page.waitForTimeout(2000)
  if (!(await page.getByText('Nothing to show').first().isVisible().catch(() => false))) findings.push('/sources/10.0.0.1: a missing source does not show the not-found page')
  await page.close()
}

await browser.close()
console.log(`checked ${pages.length} pages: skeleton first, then data`)
if (findings.length) {
  for (const finding of findings) console.log(`  FAIL ${finding}`)
  process.exit(1)
}
