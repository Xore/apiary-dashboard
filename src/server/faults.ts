// Mock-only failure injection for the tiers the dashboard depends on but
// does not own: `APIARY_MOCK_FAULTS=session-store,identity-provider` makes
// the session store or the identity provider stop answering, so the
// failure paths production takes when Redis or Keycloak is down can be
// checked end to end (smoke does). Read on every call, so a test can flip
// it. Goes away with the mock provider and store (#5).
export type Fault = 'session-store' | 'identity-provider'

export const FAULTS_ENV = 'APIARY_MOCK_FAULTS'

export function faulty(fault: Fault): boolean {
  return (process.env[FAULTS_ENV] ?? '').split(',').map((f) => f.trim()).includes(fault)
}

export class Unavailable extends Error {
  constructor(readonly fault: Fault) {
    super(`${fault} unavailable`)
  }
}

/** Throws as the dependency would when it does not answer. */
export function failIf(fault: Fault) {
  if (faulty(fault)) throw new Unavailable(fault)
}

let lastWarning = 0

/** Logs a dependency failure at most every 30 s, so a flapping store
 * cannot flood the log (canonical throttles its Redis errors the same). */
export function warnThrottled(message: string, error: unknown, now = Date.now()) {
  if (now - lastWarning < 30_000) return
  lastWarning = now
  console.warn(message, error instanceof Error ? error.message : error)
}
