// Admission gates: a fixed number of slots, no wait queue. A request that
// finds every slot taken, or the event loop already behind, is shed at once
// with 503 and Retry-After: 1 (the canonical BFF's answer), and counted on
// /metrics. A slot is held for the life of what it admits (a whole stream)
// and its release runs at most once.
import { eventLoopLagMs, recordShed } from './obs'

/** A positive number from the environment, else the fallback: compose's
 * `${VAR:-}` passes an empty string, which must not become a cap of 0. */
export function envInt(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return value > 0 ? value : fallback
}

const LAG_SHED_MS = envInt('BFF_EVENT_LOOP_SHED_MS', 250)

export function admissionGate(slots: number) {
  let active = 0
  return {
    /** A release function once admitted, or the 503 to send instead. */
    admit(): (() => void) | Response {
      const reason = eventLoopLagMs() > LAG_SHED_MS ? 'event-loop-lag' : active >= slots ? 'queue-full' : null
      if (reason) {
        recordShed(reason)
        return new Response(reason === 'event-loop-lag' ? 'bff overloaded' : 'bff at capacity', { status: 503, headers: { 'retry-after': '1' } })
      }
      active++
      let released = false
      return () => {
        if (released) return
        released = true
        active--
      }
    },
  }
}
