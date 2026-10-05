// The mock backend, server-side: every query of the implementation run as
// the backend in a given scenario answers it, for a given user. The server
// functions (src/data/queries.ts) call it for the signed-in user of the
// request; downloads do the same. Tests and scripts call it without a user,
// as a trusted internal caller. The browser never loads it.
import { ApiError } from './errors'
import { MOCK_USER } from './mock/fixtures'
import * as impl from './queries.impl'
import { runScenario } from './scenario'
import { isScenario } from './scenarios'
import type { MockScenario } from './scenarios'
import type { SessionUser } from './types'
import { authorize } from '#/server/authorize'

type Impl = typeof impl
/** The queries: every async export of the implementation. */
export type QueryName = { [K in keyof Impl]: Impl[K] extends (...args: never[]) => Promise<unknown> ? K : never }[keyof Impl]
export type Backend = { [K in QueryName]: Impl[K] }

const QUERIES = Object.entries(impl).filter(([, value]) => typeof value === 'function' && value.constructor.name === 'AsyncFunction') as Array<[QueryName, (...args: unknown[]) => Promise<unknown>]>

export const queryNames = (): QueryName[] => QUERIES.map(([name]) => name)

/** The caller: a signed-in user, nobody (null), or the trusted internal
 * caller (undefined: tests, scripts), which is not checked. */
export type Caller = SessionUser | null | undefined

/** The backend as it answers in `scenario`, for `caller`. The viewer
 * scenario signs any caller in as a viewer, for designing that role. */
export function backend(scenario: MockScenario = 'normal', caller?: Caller): Backend {
  const user = caller && scenario === 'viewer' ? { ...caller, name: 'Analyst', roles: ['viewer'] } : caller
  return Object.fromEntries(
    QUERIES.map(([name, query]) => {
      const answer = runScenario(name, query, scenario)
      const guarded = async (...args: unknown[]) => {
        if (name === 'getSessionUser') return user === undefined ? MOCK_USER : user
        if (user !== undefined) {
          const decision = authorize(name, user)
          if (decision === 'sign-in') throw new ApiError('expired', name)
          if (decision === 'admin-only') throw new ApiError('forbidden', name)
        }
        return answer(...args)
      }
      return [name, guarded]
    }),
  ) as unknown as Backend
}

/** One call from a server function: by name, with its arguments, in the
 * page's scenario, for the request's signed-in user.
 *
 * There is exactly one funnel, so this is where the real backend sits
 * alongside the mock (src/data/api.ts). A `?mock=` scenario, an unconfigured
 * BACKEND_URL, or a query this slice has not wired all fall through to the
 * mock; anything else answers from the API. Both paths set the refusal as
 * the response status and reach the pages in the same states. */
export async function runForRequest(name: string, args: unknown[], scenario: unknown): Promise<unknown> {
  const [{ getRequest, setResponseStatus }, { resolveUser }] = await Promise.all([import('@tanstack/react-start/server'), import('#/server/identity')])
  const user = await resolveUser(getRequest())
  const live = isScenario(scenario) ? undefined : (await import('./api')).liveQuery(name, user)
  const query = (live ?? backend(isScenario(scenario) ? scenario : 'normal', user)[name as QueryName]) as ((...a: unknown[]) => Promise<unknown>) | undefined
  if (!query) throw new Error(`unknown query ${name}`)
  try {
    return await query(...args)
  } catch (error) {
    // The refusal is the response's status too (401, 403, 502, …), as the
    // real backend answers it, not only a message in the payload.
    if (error instanceof ApiError) setResponseStatus(error.status)
    throw error
  }
}
