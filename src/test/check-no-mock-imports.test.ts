import { describe, expect, it } from 'vitest'
import { findStaticMockImports, isMockTier, resolveSpecifier } from '../../scripts/check-no-mock-imports'

describe('resolveSpecifier', () => {
  it('resolves relative and alias specifiers into src/', () => {
    expect(resolveSpecifier('src/data/api.ts', './mock/sensors')).toBe('src/data/mock/sensors')
    expect(resolveSpecifier('src/routes/api.live.ts', '../data/mock/liveFeed')).toBe('src/data/mock/liveFeed')
    expect(resolveSpecifier('src/routes/x.ts', '#/data/mock/charts')).toBe('src/data/mock/charts')
    expect(resolveSpecifier('src/routes/x.ts', 'react')).toBeUndefined()
  })
})

describe('isMockTier', () => {
  it('exempts the mock tier and tests, and nothing else', () => {
    for (const f of ['src/data/mock/fleet.ts', 'src/data/queries.impl.ts', 'src/data/backend.ts', 'src/data/scenario.ts', 'src/test/setup.ts', 'src/lib/format.test.ts', 'src/components/X.test.tsx', 'scripts/crawl.ts']) {
      expect(isMockTier(f), f).toBe(true)
    }
    for (const f of ['src/data/api.ts', 'src/data/readOnly.ts', 'src/routes/api.live.ts', 'src/lib/sensorSpecs.ts']) {
      expect(isMockTier(f), f).toBe(false)
    }
  })
})

describe('findStaticMockImports', () => {
  it('flags static imports and re-exports of the mock tier, with their line', () => {
    const text = "import { a } from './x'\nimport { readingOf } from './mock/sensors'\nexport * from '#/data/mock/charts'\n"
    expect(findStaticMockImports('src/data/api.ts', text)).toEqual([
      { line: 2, specifier: './mock/sensors' },
      { line: 3, specifier: '#/data/mock/charts' },
    ])
  })

  it('flags a multi-line static import', () => {
    const text = "import {\n  listen,\n  other,\n} from '#/data/mock/liveFeed'\n"
    // Reported on the line the statement starts.
    expect(findStaticMockImports('src/routes/api.live.ts', text)).toEqual([{ line: 1, specifier: '#/data/mock/liveFeed' }])
  })

  it('allows dynamic import() of the mock tier', () => {
    const text = "export async function f() {\n  const { listen } = await import('#/data/mock/liveFeed')\n  return listen\n}\n"
    expect(findStaticMockImports('src/routes/api.live.ts', text)).toEqual([])
  })

  it('ignores imports that do not point into the mock directory', () => {
    const text = "import x from '#/data/mockery'\nimport y from './mockups/z'\nimport z from 'mock-lib'\n"
    expect(findStaticMockImports('src/data/api.ts', text)).toEqual([])
  })

  it('ignores a mock import that only appears in a comment', () => {
    const text = "// import { x } from '#/data/mock/fleet'\n/* export * from './mock/charts' */\nconst a = 1\n"
    expect(findStaticMockImports('src/data/api.ts', text)).toEqual([])
  })
})
