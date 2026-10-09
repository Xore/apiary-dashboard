// The browser side of the data seam's server functions: which mock scenario
// a call runs in, and the record of every call the report-a-problem capture
// keeps. Client-safe.
import { createIsomorphicFn, createMiddleware, createServerFn } from '@tanstack/react-start'
import { getRequestUrl } from '@tanstack/react-start/server'
import { ApiError, asApiError } from './errors'
import { API_CALL, isScenario } from './scenarios'
import type { ApiCallRecord, MockScenario } from './scenarios'
import { mockScenariosAllowed } from '#/server/policy'

// The browser's scenario for the navigation in progress: the layout sets it
// before any loader runs, because the address bar only changes once the
// navigation commits.
let navigationScenario: MockScenario | undefined

/** Called by the layout's beforeLoad with the destination's `?mock=`. */
export function setNavigationScenario(scenario: MockScenario | undefined) {
  if (typeof window !== 'undefined') navigationScenario = scenario ?? 'normal'
}

const fromSearch = (search: URLSearchParams): MockScenario => {
  const mock = search.get('mock')
  return isScenario(mock) ? mock : 'normal'
}

/** On the server: the `?mock=` of the page request being rendered. Outside
 * a request (tests, scripts) there is none: the normal backend. */
const requestScenario = createIsomorphicFn()
  .server((): MockScenario => {
    try {
      return fromSearch(getRequestUrl().searchParams)
    } catch {
      return 'normal'
    }
  })
  .client((): MockScenario => 'normal')

/** The scenario of the page making the call: its `?mock=`, from the
 * navigation in progress (else the address bar) in the browser and from
 * the page request during SSR. */
export function pageScenario(): MockScenario {
  if (typeof window !== 'undefined') return navigationScenario ?? fromSearch(new URLSearchParams(window.location.search))
  return requestScenario()
}

/** Sends the page's scenario with every call; the handler reads it from
 * `context.mock`. A mock-only concern: the real backend has no scenarios. */
export const mockScenarioMiddleware = createMiddleware({ type: 'function' })
  .client(({ next }) => next({ sendContext: { mock: pageScenario() } }))
  .server(({ next, context }) => next({ context: { mock: mockScenariosAllowed() && isScenario(context.mock) ? context.mock : 'normal' } }))

/** Whether the Mock data menu may show: the server's policy, since only the
 * server knows whether a live backend is configured. */
export const getMockScenariosAllowed = createServerFn({ method: 'GET' }).handler(() => mockScenariosAllowed())

/** What crosses the wire, as Start's serializer can prove: JSON. The
 * exports keep each query's own types; this is only the handler's side. */
export type Json = string | number | boolean | null | undefined | Json[] | { [key: string]: Json }

function announce(record: ApiCallRecord) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<ApiCallRecord>(API_CALL, { detail: record }))
}

/** A server function called with the query's own arguments, timed and
 * announced, so pages keep calling `getEvents(filters)`. */
export function announced(name: string, fn: (options: { data: unknown[] }) => Promise<unknown>) {
  return async (...args: unknown[]) => {
    const started = Date.now()
    try {
      const result = await fn({ data: args })
      announce({ name, ok: true, status: 200, ms: Date.now() - started })
      return result
    } catch (error) {
      const api = asApiError(error)
      announce({ name, ok: false, status: api ? api.status : error instanceof ApiError ? error.status : 500, ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }
}
