// The mock backend, server-side: every query of the implementation run as
// the backend in a given scenario answers it. The server functions
// (src/data/queries.ts), the file downloads and the tests all go through
// here; the browser never loads it.
import * as impl from './queries.impl'
import { runScenario } from './scenario'
import { isScenario } from './scenarios'
import type { MockScenario } from './scenarios'

type Impl = typeof impl
/** The queries: every async export of the implementation. */
export type QueryName = { [K in keyof Impl]: Impl[K] extends (...args: never[]) => Promise<unknown> ? K : never }[keyof Impl]
export type Backend = { [K in QueryName]: Impl[K] }

const QUERIES = Object.entries(impl).filter(([, value]) => typeof value === 'function' && value.constructor.name === 'AsyncFunction') as Array<[QueryName, (...args: unknown[]) => Promise<unknown>]>

/** The backend as it answers in `scenario`. */
export function backend(scenario: MockScenario = 'normal'): Backend {
  return Object.fromEntries(QUERIES.map(([name, query]) => [name, runScenario(name, query, scenario)])) as unknown as Backend
}

export const queryNames = (): QueryName[] => QUERIES.map(([name]) => name)

/** One call from a server function: by name, with its arguments, in the
 * scenario the page is in. */
export function run(name: string, args: unknown[], scenario: unknown): Promise<unknown> {
  const query = backend(isScenario(scenario) ? scenario : 'normal')[name as QueryName] as ((...a: unknown[]) => Promise<unknown>) | undefined
  if (!query) throw new Error(`unknown query ${name}`)
  return query(...args)
}
