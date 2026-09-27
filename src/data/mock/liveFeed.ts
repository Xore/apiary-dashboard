// The mock backend's live feed: one generator for the whole server, running
// while anyone listens, appending each new event to the shared event set
// (so every page that reads it sees it) and handing it to every listener.
// The /api/live endpoint streams it; the real one proxies the Rust tier's.
import type { HoneypotEvent } from '../types'
import { onHealthChanged, silentSensors } from './incidents'
import { nextLiveEvent } from './live'

export type FeedListener = { event: (event: HoneypotEvent) => void; health: () => void }

const listeners = new Set<FeedListener>()
let timer: ReturnType<typeof setTimeout> | undefined
let unsubscribeHealth: (() => void) | undefined

function tick() {
  const event = nextLiveEvent(silentSensors())
  if (event) for (const listener of listeners) listener.event(event)
  // A few events a second at most, like a busy fleet.
  timer = setTimeout(tick, 1200 + Math.random() * 1200)
}

/** Listen to the feed; returns the function that stops listening. */
export function listen(listener: FeedListener): () => void {
  listeners.add(listener)
  if (listeners.size === 1) {
    timer = setTimeout(tick, 400)
    unsubscribeHealth = onHealthChanged(() => {
      for (const l of listeners) l.health()
    })
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      clearTimeout(timer)
      unsubscribeHealth?.()
    }
  }
}
