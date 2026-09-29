// Every page loads skeleton first: each route under the shell renders on the
// server through pageSsr (its own skeleton for a browser), unless it only
// redirects, which stays a real server redirect. A new page that forgets it
// would block a browser's first paint on its data again.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const dir = join(import.meta.dirname, '../routes/_layout')
const routes = readdirSync(dir).filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))

describe('page routes', () => {
  it('render skeleton first, or only redirect', () => {
    const missing = routes.filter((file) => {
      const source = readFileSync(join(dir, file), 'utf8')
      const renders = /\b(component|pendingComponent|loader):/.test(source)
      return renders && !source.includes('ssr: pageSsr')
    })
    expect(missing).toEqual([])
  })

  it('have their own skeleton to show while loading, not the generic one', () => {
    const without = routes.filter((file) => {
      const source = readFileSync(join(dir, file), 'utf8')
      return source.includes('ssr: pageSsr') && !/\bpendingComponent:/.test(source)
    })
    expect(without).toEqual([])
  })
})
