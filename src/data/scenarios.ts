// The mock backend's scenarios, as the page knows them: which exist, and the
// `?mock=` value that picks one. Client-safe; the rules that implement them
// live in the server-only scenario.ts.

export type MockScenario = 'normal' | 'empty' | 'large' | 'slow' | 'loading' | 'partial' | 'unavailable' | 'overloaded' | 'expired' | 'viewer'

export const SCENARIOS: Array<{ id: MockScenario; label: string; description: string }> = [
  { id: 'normal', label: 'Normal', description: 'Seeded mock data, every call succeeds.' },
  { id: 'empty', label: 'Empty', description: 'A backend with no data yet: every list empty, every count zero.' },
  { id: 'large', label: 'Large volumes', description: 'A busy deployment: six-digit counts, long lists, long values.' },
  { id: 'slow', label: 'Slow', description: 'Every call takes 2.5 s: loading states.' },
  { id: 'loading', label: 'Loading forever', description: 'Every page stays on its skeleton, in the full layout.' },
  { id: 'partial', label: 'Partly failing', description: 'About a third of the calls fail; the rest succeed.' },
  { id: 'unavailable', label: 'Backend down', description: 'Every call fails with 502.' },
  { id: 'overloaded', label: 'Overloaded', description: 'Every call is shed with 503 and Retry-After: 30.' },
  { id: 'expired', label: 'Session expired', description: 'Every call answers 401.' },
  { id: 'viewer', label: 'Viewer role', description: 'Signed in without admin: admin actions are refused with 403.' },
]

export const isScenario = (value: unknown): value is MockScenario => SCENARIOS.some((s) => s.id === value)

/** Every call, as the browser sees it: the mock of the fetch log the
 * report-a-problem capture keeps (name, outcome, status, duration). */
export const API_CALL = 'apiary-api-call'
export type ApiCallRecord = { name: string; ok: boolean; status: number; ms: number; error?: string }
