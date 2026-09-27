// Per-route inventory of the canonical dashboard (#2): for every page route,
// the data it reads (with the fields), the mutations it can make (with who
// may make them), and the user-visible states its source handles. Built
// from docs/migration/server-functions.json (scripts/inventory/
// server-functions.ts) and the pinned source.
//
//   bun scripts/inventory/routes.ts <canonical frontend-next dir>
//
// Writes docs/migration/routes.json and routes.md.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ServerFn } from './server-functions'

export type RouteInventory = {
  route: string
  /** Files whose behavior the route carries: itself and the components it
   * imports, transitively. */
  files: string[]
  reads: Array<{ fn: string; output: string; fields: string[]; loader: boolean }>
  /** Direct handlers the page calls itself (charts, topology, the stream,
   * downloads): paths as written. */
  handlers: string[]
  mutations: Array<{ fn: string; permission: ServerFn['permission']; backend: string[] }>
  states: string[]
  /** What the page says when there is nothing to show. */
  emptyMessages: string[]
}

const root = process.argv[2]
if (import.meta.main && !root) {
  console.error('usage: bun scripts/inventory/routes.ts <canonical frontend-next dir>')
  process.exit(1)
}

/** User-visible states, recognized by what the source uses for them. */
const STATES: Array<[string, RegExp]> = [
  ['loading skeleton', /skeleton/],
  ['error with retry', /ErrorStateBlock|onRetry/],
  ['empty state', /hint=|empty-state|No [a-z][a-z ,/-]+(yet|in this window|match|found)/],
  ['confirmation before a destructive action', /confirmAction\(/],
  ['redirect', /\bredirect\(/],
  ['not found', /notFound|NotFound/],
  ['copy feedback', /copyWithFlash|flash\(/],
  ['admin-only controls', /role\s*[!=]==?\s*'admin'|isAdmin/],
  ['session expiry recovery', /beginReauth|useSessionWatch|checkSessionAlive/],
  ['paging (view more / offset)', /offset[:=]|viewMore|Load more|View more/i],
  ['live refresh', /useLive|EventSource|\/api\/live/],
  ['download or export', /\/api\/(export|payload|recording|report|artifact|canarytoken|raw-report)\/|\.download\s*=|\bdownload=/],
]

function importsOf(rel: string, text: string, known: Set<string>): string[] {
  const dir = rel.split('/').slice(0, -1)
  return [...text.matchAll(/from\s+'(\.[^']+)'/g)].flatMap(([, spec]) => {
    const parts = [...dir]
    for (const segment of spec.split('/')) {
      if (segment === '..') parts.pop()
      else if (segment !== '.') parts.push(segment)
    }
    const base = parts.join('/')
    const hit = [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`].find((c) => known.has(c))
    return hit ? [hit] : []
  })
}

export function routeInventory(dir: string, fns: ServerFn[]): RouteInventory[] {
  const list = (sub: string): string[] =>
    readdirSync(join(dir, sub), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(`${sub}/${e.name}`) : /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [`${sub}/${e.name}`] : []))
  const all = list('src')
  const known = new Set(all)
  const text = new Map(all.map((f) => [f, readFileSync(join(dir, f), 'utf8')]))

  // Components and hooks a route carries; server-only and plumbing modules
  // (lib/*.server, lib/backend) are not what the page shows.
  const closure = (start: string) => {
    const seen = new Set([start])
    const queue = [start]
    while (queue.length) {
      const file = queue.shift()!
      for (const next of importsOf(file, text.get(file)!, known)) {
        if (seen.has(next) || !next.startsWith('src/components/')) continue
        seen.add(next)
        queue.push(next)
      }
    }
    return [...seen]
  }

  const pages = all.filter((f) => f.startsWith('src/routes/') && f.endsWith('.tsx') && !f.includes('/api/') && !f.includes('/auth/') && !f.endsWith('__root.tsx'))
  return pages.map((route) => {
    const files = closure(route)
    const used = fns.filter((f) => f.file === route || f.callers.some((c) => files.includes(c.file)))
    const source = files.map((f) => text.get(f)!).join('\n')
    const own = text.get(route)!
    const empty = [...new Set([...own.matchAll(/hint="([^"]{8,140})"/g)].map((m) => m[1]))].slice(0, 6)
    return {
      route: route.replace(/^src\/routes\//, ''),
      files: files.map((f) => f.replace(/^src\//, '')),
      handlers: [...new Set([...source.matchAll(/[`'"](\/(?:api|export)\/[^`'"?\s]*)/g)].map((m) => m[1].replace(/\$\{[^}]*\}/g, '{…}')))].sort(),
      reads: used.filter((f) => f.method === 'GET').map((f) => ({ fn: f.id.replace(/^src\//, ''), output: f.output, fields: f.fields, loader: f.loader })),
      mutations: used.filter((f) => f.method === 'POST').map((f) => ({ fn: f.id.replace(/^src\//, ''), permission: f.permission, backend: f.backend })),
      states: STATES.filter(([, test]) => test.test(source)).map(([name]) => name),
      emptyMessages: empty,
    }
  })
}

export function renderRoutes(routes: RouteInventory[], sliceOf: (route: string) => string = () => '—'): string {
  const cell = (t: string) => t.replace(/\|/g, '\\|').replace(/</g, '&lt;')
  const lines = [
    '# Routes: data, mutations and states',
    '',
    'Every page route of the canonical dashboard (`Xore/APIARY@62ee45d`): the data it reads, the mutations it can make, and the user-visible states its source handles, counting the components it imports. Built by `scripts/inventory/routes.ts` from `server-functions.json` and the source. Data: `routes.json`. Direct handlers and auth routes are in `route-matrix.md`.',
    '',
    `**${routes.length} page routes**, ${routes.reduce((n, r) => n + r.reads.length, 0)} reads and ${routes.reduce((n, r) => n + r.mutations.length, 0)} mutations (a function used by several routes counts in each).`,
    '',
  ]
  for (const r of routes) {
    lines.push(`## \`${r.route}\``, '', `Slice: ${sliceOf(r.route)}`, '')
    if (r.files.length > 1) lines.push(`Carries: ${r.files.slice(1).map((f) => `\`${f}\``).join(', ')}`, '')
    lines.push('**Reads**', '')
    if (!r.reads.length && !r.handlers.length) lines.push('- none', '')
    for (const read of r.reads) {
      const fields = read.fields.length ? ` — ${read.fields.slice(0, 16).map((f) => `\`${cell(f)}\``).join(', ')}${read.fields.length > 16 ? `, … ${read.fields.length - 16} more` : ''}` : ''
      lines.push(`- \`${read.fn}\`${read.loader ? ' (loader)' : ''} → ${cell(read.output)}${fields}`)
    }
    if (r.handlers.length) lines.push(`- direct handlers: ${r.handlers.map((h) => `\`${cell(h)}\``).join(', ')}`)
    lines.push('', '**Mutations**', '')
    if (!r.mutations.length) lines.push('- none')
    for (const m of r.mutations) lines.push(`- \`${m.fn}\` (${m.permission}) → ${m.backend.map((b) => `\`${cell(b)}\``).join(', ') || '—'}`)
    lines.push('', `**States:** ${r.states.join(', ') || '—'}`, '')
    if (r.emptyMessages.length) lines.push(`**Empty/hint text:** ${r.emptyMessages.map((m) => `“${cell(m)}”`).join('; ')}`, '')
  }
  return lines.join('\n')
}

if (import.meta.main) {
  const out = join(import.meta.dirname, '..', '..', 'docs/migration')
  const fns = JSON.parse(readFileSync(join(out, 'server-functions.json'), 'utf8')) as ServerFn[]
  const routes = routeInventory(root, fns)
  writeFileSync(join(out, 'routes.json'), `${JSON.stringify(routes, null, 2)}\n`)
  writeFileSync(join(out, 'routes.md'), renderRoutes(routes))
  console.log(`${routes.length} page routes`)
}
