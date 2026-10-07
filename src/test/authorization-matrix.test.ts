import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { queryNames } from '#/data/backend'
import {
  renderAuthorizationMatrix,
  routePaths,
  routePolicy,
} from '../../scripts/authorization-matrix'

const root = join(import.meta.dirname, '..', '..')

describe('authorization matrix document', () => {
  it('classifies every generated route exactly once', () => {
    const paths = routePaths()
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.map((path) => routePolicy(path))).toHaveLength(paths.length)
  })

  it('covers every server query and stays generated', () => {
    const document = readFileSync(
      join(root, 'docs/migration/authorization-matrix.md'),
      'utf8',
    )
    expect(document).toBe(renderAuthorizationMatrix())
    for (const name of queryNames())
      expect(document).toContain(`| \`${name}\` |`)
  })
})
