// Mock-tier boundary: fails when a file outside the mock tier statically
// imports from src/data/mock/. Live code may load the mock with a dynamic
// import() inside the arm that serves it; a static import would put the
// mock fixtures into the production bundle and the live module graph.
//
// Mock tier (allowed to import the mock): src/data/mock/**,
// src/data/queries.impl.ts, src/data/backend.ts, src/data/scenario.ts,
// src/test/**, *.test.ts(x), and scripts/.
//
//   bun scripts/check-no-mock-imports.ts
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { posix } from 'node:path'

const MOCK_DIR = 'src/data/mock/'
const MOCK_TIER_FILES = new Set(['src/data/queries.impl.ts', 'src/data/backend.ts', 'src/data/scenario.ts'])

// TODO(#228): remove this exemption once #229 lands; shared.ts still imports
// MOCK_NOW until then. until #229 merges
const TEMPORARY_EXEMPT = new Set(['src/data/shared.ts'])

/** Whether a repo-relative path belongs to the mock tier (and is not checked). */
export function isMockTier(file: string): boolean {
  return file.startsWith(MOCK_DIR) || file.startsWith('src/test/') || file.startsWith('scripts/') || MOCK_TIER_FILES.has(file) || /\.test\.tsx?$/.test(file)
}

/** The repo-relative path a module specifier names, or undefined for a
 * bare package name. Handles relative specifiers and the `#/` and `@/`
 * aliases that point into src/. */
export function resolveSpecifier(fromFile: string, specifier: string): string | undefined {
  if (specifier.startsWith('.')) return posix.normalize(posix.join(posix.dirname(fromFile), specifier))
  for (const alias of ['#/', '@/']) if (specifier.startsWith(alias)) return posix.join('src', specifier.slice(alias.length))
  return undefined
}

// Whole-line comments only: a `from '...'` inside prose is not an import.
const COMMENT_LINE = /^[ \t]*\/\/.*$/gm
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g
// `import`/`export` … `from '<spec>'`. A dynamic `import('…')` has a quote
// straight after the keyword, so the character class stops it from matching.
const STATIC_IMPORT = /\b(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g

/** Static imports of the mock tier in one file: the specifier and its line. */
export function findStaticMockImports(file: string, text: string): Array<{ line: number; specifier: string }> {
  // Blank out comments but keep newlines, so line numbers stay true.
  const code = text.replace(BLOCK_COMMENT, (c) => c.replace(/[^\n]/g, ' ')).replace(COMMENT_LINE, (c) => ' '.repeat(c.length))
  const found: Array<{ line: number; specifier: string }> = []
  for (const match of code.matchAll(STATIC_IMPORT)) {
    const resolved = resolveSpecifier(file, match[1])
    if (resolved === undefined) continue
    if (resolved.startsWith(MOCK_DIR) || resolved === 'src/data/mock') {
      found.push({ line: code.slice(0, match.index).split('\n').length, specifier: match[1] })
    }
  }
  return found
}

function main(): void {
  const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', 'src'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => /\.(ts|tsx|mts|mjs|js|jsx)$/.test(f) && !isMockTier(f) && !TEMPORARY_EXEMPT.has(f))
  const findings: string[] = []
  for (const file of files) {
    let text: string
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    for (const { line, specifier } of findStaticMockImports(file, text)) {
      findings.push(`${file}:${line}: static import of '${specifier}' from the mock tier; use await import() inside the arm that serves it`)
    }
  }
  if (findings.length) {
    console.error(findings.join('\n'))
    console.error(`\n${findings.length} static mock-tier import(s) in live code.`)
    process.exit(1)
  }
  console.log(`no static mock-tier imports in ${files.length} live files`)
}

if (import.meta.main) main()
