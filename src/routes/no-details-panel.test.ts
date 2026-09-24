// Epic #25 replaced the right-hand details panel with entity pages. This keeps
// it from creeping back: no page may render a side panel or an inspector, and
// every RecordList row must open a page.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(import.meta.dirname, '..')

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })
}

describe('no details panel', () => {
  const files = sources(SRC).map((path) => ({ path: path.slice(SRC.length + 1), text: readFileSync(path, 'utf8') }))

  it('no page renders a side panel or an inspector', () => {
    const offenders = files.filter((f) => /LayoutPanel|renderInspector|inspectorTitle/.test(f.text)).map((f) => f.path)
    expect(offenders).toEqual([])
  })

  it('every RecordList opens its rows as pages', () => {
    const lists = files.filter((f) => f.text.includes('<RecordList'))
    expect(lists.length).toBeGreaterThan(20)
    const missing = lists.filter((f) => (f.text.match(/<RecordList/g) ?? []).length !== (f.text.match(/getHref=/g) ?? []).length).map((f) => f.path)
    expect(missing).toEqual([])
  })
})
