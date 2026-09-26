// The route matrix (#2) stays complete and true: every canonical route has
// exactly one row, every destination is a real route of the rewrite, and the
// document matches the data.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROWS, renderMatrix } from '../../scripts/route-matrix'

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

  it('gives every pending route a note saying what stands in', () => {
    expect(ROWS.filter((r) => r.status === 'pending' && !r.note)).toEqual([])
    expect(ROWS.filter((r) => r.status !== 'pending' && r.destination.length === 0)).toEqual([])
  })

  it('is written down as generated', () => {
    expect(readFileSync(join(root, 'docs/migration/route-matrix.md'), 'utf8')).toBe(renderMatrix())
  })
})
