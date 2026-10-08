import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { liveQueryNames } from '#/data/api'
import { queryNames } from '#/data/backend'
import {
  BACKEND_EXCEPTIONS,
  renderBackendCoverage,
} from '../../scripts/backend-coverage'

const root = join(import.meta.dirname, '..', '..')

describe('backend coverage', () => {
  it('explains every query that does not use the live adapter', () => {
    const live = new Set(liveQueryNames())
    expect(
      queryNames()
        .filter((name) => !live.has(name))
        .sort(),
    ).toEqual(Object.keys(BACKEND_EXCEPTIONS).sort())
    expect(
      Object.keys(BACKEND_EXCEPTIONS).filter(
        (name) => !queryNames().includes(name as never),
      ),
    ).toEqual([])
  })

  it('is written down as generated', () => {
    expect(
      readFileSync(join(root, 'docs/migration/backend-coverage.md'), 'utf8'),
    ).toBe(renderBackendCoverage())
  })
})
