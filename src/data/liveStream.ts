// The live event stream, the one connection the shell keeps open. The real
// tier is an EventSource on /api/live; this is its mock, driven by the mock
// live generator and the active scenario: an outage breaks the stream, an
// empty backend keeps it open and quiet, a slow one sends sparsely.
import { nextLiveEvent } from './mock/live'
import { silentSensors } from './mock/incidents'
import { mockScenario } from './scenario'
import type { HoneypotEvent } from './types'

export type StreamCallbacks = { onEvent: (event: HoneypotEvent) => void; onHealth: (healthy: boolean) => void }

/** Opens the stream; returns the function that closes it. */
export function openLiveStream({ onEvent, onHealth }: StreamCallbacks): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let closed = false
  const tick = () => {
    if (closed) return
    const scenario = mockScenario()
    const broken = scenario === 'unavailable' || scenario === 'overloaded' || scenario === 'expired'
    onHealth(!broken)
    if (!broken && scenario !== 'empty') {
      const event = nextLiveEvent(silentSensors())
      if (event) onEvent(event)
    }
    // A few events a second at most, like a busy fleet, sparser when slow.
    const base = scenario === 'slow' ? 6000 : 1200
    timer = setTimeout(tick, base + Math.random() * base)
  }
  timer = setTimeout(tick, 400)
  return () => {
    closed = true
    clearTimeout(timer)
  }
}
