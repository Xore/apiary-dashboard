// The route matrix (#2) stays complete and true: every canonical route has
// exactly one row, every destination is a real route of the rewrite, and the
// document matches the data.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROWS, renderMatrix } from '../../scripts/route-matrix'
import { COMPONENT_ROWS, renderComponentMatrix } from '../../scripts/component-matrix'
import { issueNumbers, rewriteOwners, sliceOfFn, sliceOfRoute, sliceRef } from '../../scripts/inventory/slice-map'
import type { RouteInventory } from '../../scripts/inventory/routes'
import { renderInventory } from '../../scripts/inventory/server-functions'
import type { ServerFn } from '../../scripts/inventory/server-functions'

const root = join(import.meta.dirname, '..', '..')
const canonical = readFileSync(join(root, 'docs/migration/canonical-routes.txt'), 'utf8')
  .split('\n')
  .filter((line) => line && !line.startsWith('#'))

/** The rewrite's route paths, from the generated route tree. */
const routeTree = readFileSync(join(root, 'src/routeTree.gen.ts'), 'utf8')
const block = routeTree.slice(routeTree.indexOf('export interface FileRoutesByFullPath'))
const ours = new Set(
  [...block.slice(0, block.indexOf('\n}')).matchAll(/^\s+'([^']+)':/gm)].map((m) => (m[1].length > 1 ? m[1].replace(/\/$/, '') : m[1])),
)

describe('route matrix', () => {
  it('has exactly one row for every canonical route', () => {
    const sources = ROWS.map((r) => r.source)
    expect(new Set(sources).size).toBe(sources.length)
    expect([...sources].sort()).toEqual([...canonical].sort())
  })

  it('points only at routes the rewrite has', () => {
    const missing = ROWS.flatMap((r) => r.destination.filter((d) => !ours.has(d)).map((d) => `${r.source} → ${d}`))
    expect(missing).toEqual([])
  })

  it('names the security owner of every direct handler and auth route', () => {
    expect(ROWS.filter((r) => r.source.endsWith('.ts') && !r.security).map((r) => r.source)).toEqual([])
  })

  it('has no unexplained or unmapped route gaps', () => {
    expect(ROWS.filter((r) => r.status === 'pending')).toEqual([])
    expect(ROWS.filter((r) => r.destination.length === 0 && !r.owners?.length)).toEqual([])
    expect(ROWS.flatMap((r) => r.owners ?? []).filter((owner) => !existsSync(join(root, owner)))).toEqual([])
  })

  it('links every route and server function to a slice issue', () => {
    const numbers = issueNumbers()
    const fns = JSON.parse(readFileSync(join(root, 'docs/migration/server-functions.json'), 'utf8')) as ServerFn[]
    const routes = JSON.parse(readFileSync(join(root, 'docs/migration/routes.json'), 'utf8')) as RouteInventory[]
    expect(ROWS.filter((r) => !numbers[sliceOfRoute(r.source) ?? ''])).toEqual([])
    expect(fns.filter((f) => !numbers[sliceOfFn(f, routes)])).toEqual([])
  })

  it('maps every canonical server function to existing rewrite owners', () => {
    const fns = JSON.parse(readFileSync(join(root, 'docs/migration/server-functions.json'), 'utf8')) as ServerFn[]
    const routes = JSON.parse(readFileSync(join(root, 'docs/migration/routes.json'), 'utf8')) as RouteInventory[]
    const owners = fns.flatMap((fn) => rewriteOwners(sliceOfFn(fn, routes), fn))
    expect(fns).toHaveLength(153)
    expect(owners.length).toBeGreaterThanOrEqual(fns.length)
    expect(owners.filter((owner) => !existsSync(join(root, owner)))).toEqual([])
    expect(readFileSync(join(root, 'docs/migration/server-functions.md'), 'utf8')).toBe(
      renderInventory(fns, (fn) => sliceRef(sliceOfFn(fn, routes)), (fn) => rewriteOwners(sliceOfFn(fn, routes), fn)),
    )
  })

  it('is written down as generated', () => {
    expect(readFileSync(join(root, 'docs/migration/route-matrix.md'), 'utf8')).toBe(renderMatrix())
  })
})

describe('component matrix', () => {
  const canonicalComponents = readFileSync(join(root, 'docs/migration/canonical-components.txt'), 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))

  it('maps every canonical component to existing rewrite owners', () => {
    const sources = COMPONENT_ROWS.map((row) => row.source)
    expect(new Set(sources).size).toBe(sources.length)
    expect([...sources].sort()).toEqual([...canonicalComponents].sort())
    expect(COMPONENT_ROWS.flatMap((row) => row.destination).filter((owner) => !existsSync(join(root, owner)))).toEqual([])
  })

  it('is written down as generated', () => {
    expect(readFileSync(join(root, 'docs/migration/components.md'), 'utf8')).toBe(renderComponentMatrix())
  })
})
