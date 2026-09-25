// Every kind of page at phone, tablet, laptop and 4K widths: nothing may
// scroll sideways, no top-bar control may leave the screen or overlap
// another, the shell must fit the window, and no page may throw.
//
//   bun scripts/responsive.ts http://localhost:3000
//
// Uses Chrome (CHROME_PATH, else /usr/bin/google-chrome) or Playwright's
// own Chromium; exits 2 when no browser is available so callers can skip.
import { existsSync } from 'node:fs'
import { chromium, devices } from 'playwright-core'
import type { Browser } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:3000'

const PAGES = [
  '/',
  '/?view=behavior',
  '/events',
  '/sources/198.51.100.13',
  '/payloads/320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37/ghidra?section=code',
  '/payload-workbench/results',
  '/kill-chain',
  '/alerts',
  '/reports/history',
  '/auth/login',
]

const SIZES = [
  { name: 'phone', options: { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } } },
  { name: 'tablet', options: { viewport: { width: 768, height: 1024 } } },
  { name: 'laptop', options: { viewport: { width: 1440, height: 900 } } },
  { name: '4k', options: { viewport: { width: 3840, height: 2160 } } },
]

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
  console.log('no browser available (set CHROME_PATH); responsive check skipped')
  process.exit(2)
}

const findings: string[] = []
let checked = 0
for (const size of SIZES) {
  const context = await browser.newContext(size.options)
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)))
  for (const path of PAGES) {
    errors.length = 0
    await page.goto(base + path, { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    checked++
    const layout = await page.evaluate(() => {
      const doc = document.documentElement
      const bar = document.querySelector('nav[aria-label="Page header"]')
      const controls = bar
        ? [...bar.querySelectorAll('button, a, [role="combobox"]')]
            .filter((el) => el.closest('[aria-hidden="true"], [inert]') === null)
            .map((el) => ({ label: el.getAttribute('aria-label') ?? (el.textContent.trim().slice(0, 30) || el.tagName), box: el.getBoundingClientRect() }))
            .filter((c) => c.box.width > 0 && c.box.height > 0)
        : []
      const outside = controls.filter((c) => c.box.left < -1 || c.box.right > innerWidth + 1).map((c) => c.label)
      const overlaps: string[] = []
      controls.forEach((a, i) =>
        controls.slice(i + 1).forEach((b) => {
          // Nested controls (a button inside a link) are not an overlap.
          const nested = a.box.left <= b.box.left && a.box.right >= b.box.right && a.box.top <= b.box.top && a.box.bottom >= b.box.bottom
          const nestedB = b.box.left <= a.box.left && b.box.right >= a.box.right && b.box.top <= a.box.top && b.box.bottom >= a.box.bottom
          const x = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left)
          const y = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top)
          if (!nested && !nestedB && x > 2 && y > 2) overlaps.push(`${a.label} × ${b.label}`)
        }),
      )
      const shell = document.querySelector('.astryx-app-shell')?.getBoundingClientRect()
      return { scrollWidth: doc.scrollWidth, innerWidth, outside, overlaps, shellTaller: shell ? shell.height > innerHeight + 1 : false }
    })
    const where = `${size.name} ${path}`
    if (layout.scrollWidth > layout.innerWidth + 1) findings.push(`${where}: scrolls sideways (${layout.scrollWidth} > ${layout.innerWidth})`)
    if (layout.outside.length) findings.push(`${where}: top bar controls off screen: ${layout.outside.join(', ')}`)
    if (layout.overlaps.length) findings.push(`${where}: top bar controls overlap: ${layout.overlaps.join('; ')}`)
    if (layout.shellTaller) findings.push(`${where}: the shell is taller than the window`)
    if (errors.length) findings.push(`${where}: ${errors.join(' | ')}`)
  }
  await context.close()
}
await browser.close()

console.log(`checked ${checked} pages at ${SIZES.map((s) => s.name).join(', ')}`)
if (findings.length) {
  console.log(findings.join('\n'))
  process.exit(1)
}
console.log('every size fits')
