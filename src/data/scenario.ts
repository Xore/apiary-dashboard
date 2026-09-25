// Mock scenarios: make the whole data seam behave like a backend in a given
// state, so every page's empty, error, pending and role-gated states can be
// seen and designed without touching code. `?mock=<scenario>` picks one and
// sticks across navigation; the "Mock data" badge in the top bar switches.
//
// The active scenario is module state, set by the layout before any loader
// runs. On the dev server that state is per process, which is fine for a
// single designer and wrong for anything shared: this is a mock-only seam.
import { ApiError } from './errors'
import { CONFIG } from './mock/details'
import type { SessionUser } from './types'

export type MockScenario = 'normal' | 'empty' | 'slow' | 'partial' | 'unavailable' | 'overloaded' | 'expired' | 'viewer'

export const SCENARIOS: Array<{ id: MockScenario; label: string; description: string }> = [
  { id: 'normal', label: 'Normal', description: 'Seeded mock data, every call succeeds.' },
  { id: 'empty', label: 'Empty', description: 'A backend with no data yet: every list empty, every count zero.' },
  { id: 'slow', label: 'Slow', description: 'Every call takes 2.5 s: loading states.' },
  { id: 'partial', label: 'Partly failing', description: 'About a third of the calls fail; the rest succeed.' },
  { id: 'unavailable', label: 'Backend down', description: 'Every call fails with 502.' },
  { id: 'overloaded', label: 'Overloaded', description: 'Every call is shed with 503 and Retry-After: 30.' },
  { id: 'expired', label: 'Session expired', description: 'Every call answers 401.' },
  { id: 'viewer', label: 'Viewer role', description: 'Signed in without admin: admin actions are refused with 403.' },
]

export const isScenario = (value: unknown): value is MockScenario => SCENARIOS.some((s) => s.id === value)

let current: MockScenario = 'normal'

export function setMockScenario(scenario: MockScenario | undefined): void {
  current = scenario ?? 'normal'
}

export const mockScenario = (): MockScenario => current

/** Writes only an admin may make. The real tier refuses them for any other
 * role; the pages disable them with "Admin role required". */
export const ADMIN_WRITES: ReadonlySet<string> = new Set([
  'setIpBlocked',
  'runServiceAction',
  'rollbackConfig',
  'saveConfigSection',
  'purgeDeadLetters',
  'setProblemStatus',
  'createCanarytoken',
  'provisionCredential',
  'rotateCredential',
  'linkCredentialToken',
  'startAnalysisRun',
  'abortGpuJob',
  'queuePayloadAction',
])

/** Writes read-only mode still allows: turning it off, and one's own
 * preferences and problem reports. */
const READ_ONLY_EXEMPT: ReadonlySet<string> = new Set(['saveConfigSection', 'rollbackConfig', 'savePreferences', 'submitProblemReport'])

const readOnly = () => CONFIG.behavior.readOnly

const isRead = (name: string) => /^(get|search|semanticSearch|preview|resolve|validate)/.test(name)

/** Catalogs are code, not data: an empty backend still ships them. */
const KEEP_WHEN_EMPTY: Record<string, readonly string[]> = {
  getReports: ['templates', 'elements'],
  getCanarytokens: ['types'],
  getAnalysisResults: ['analyzers', 'recipes'],
}

/** Fixed sets of measures: an empty backend reports each of them as zero
 * rather than dropping them (the KPI row still has its five tiles). */
const ZERO_ITEMS: Record<string, readonly string[]> = {
  getOverview: ['kpis'],
}

/** The same shape with nothing in it: arrays empty, numbers zero. */
function emptied<T>(value: T, keep: readonly string[] = [], zeroItems: readonly string[] = []): T {
  if (Array.isArray(value)) return [] as T
  if (typeof value === 'number') return 0 as T
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => [key, keep.includes(key) ? v : zeroItems.includes(key) && Array.isArray(v) ? v.map((item: unknown) => emptied(item)) : emptied(v)]),
  ) as T
}

/** A stable third of the reads: the same calls fail on every visit. */
function failsPartly(name: string): boolean {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
  return hash % 3 === 0
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Every call, as the browser sees it: the mock of the fetch log the
 * report-a-problem capture keeps (name, outcome, status, duration). */
export const API_CALL = 'apiary-api-call'
export type ApiCallRecord = { name: string; ok: boolean; status: number; ms: number; error?: string }

function announce(record: ApiCallRecord) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<ApiCallRecord>(API_CALL, { detail: record }))
}

/** One query, run through the active scenario, and announced. */
export function withScenario<TArgs extends unknown[], TResult>(name: string, query: (...args: TArgs) => Promise<TResult>): (...args: TArgs) => Promise<TResult> {
  const scenarioQuery = runScenario(name, query)
  return async (...args) => {
    const started = Date.now()
    try {
      const result = await scenarioQuery(...args)
      announce({ name, ok: true, status: 200, ms: Date.now() - started })
      return result
    } catch (error) {
      announce({ name, ok: false, status: error instanceof ApiError ? error.status : 500, ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }
}

function runScenario<TArgs extends unknown[], TResult>(name: string, query: (...args: TArgs) => Promise<TResult>): (...args: TArgs) => Promise<TResult> {
  return async (...args) => {
    const scenario = current
    // The session comes from the sign-in cookie, not the backend: it
    // survives a backend outage, and only the role changes.
    // Cached configuration, like the session: it outlives a backend outage.
    if (name === 'getShellConfig' || name === 'getPreferences') return query(...args)
    if (name === 'getSessionUser') {
      const user = (await query(...args)) as SessionUser
      return (scenario === 'viewer' ? { ...user, name: 'Analyst', roles: ['viewer'] } : user) as TResult
    }
    if (scenario === 'slow') await wait(2500)
    if (scenario === 'unavailable' || (scenario === 'partial' && isRead(name) && failsPartly(name))) throw new ApiError('unavailable', name)
    if (scenario === 'overloaded') throw new ApiError('overloaded', name, { retryAfter: 30 })
    if (scenario === 'expired') throw new ApiError('expired', name)
    if (scenario === 'viewer' && ADMIN_WRITES.has(name)) throw new ApiError('forbidden', name)
    if (!isRead(name) && !READ_ONLY_EXEMPT.has(name) && readOnly()) throw new ApiError('locked', name)
    const result = await query(...args)
    return scenario === 'empty' && isRead(name) ? emptied(result, KEEP_WHEN_EMPTY[name], ZERO_ITEMS[name]) : result
  }
}
