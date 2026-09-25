// The mock live stream: new events arrive while the dashboard is open, in
// the fleet's proportions, from the same generators as the fixtures, and
// join the event set so every page that reads it sees them. It stands in for
// the real one-connection SSE stream (/api/live).
//
// Mock time keeps moving: an event arriving now is stamped MOCK_NOW plus the
// time since the stream started.
import type { HoneypotEvent } from '../types'
import { EVENTS, SENSORS, SOURCES, eventFrom } from './fixtures'
import { FLEET } from './fleet'
import { MOCK_NOW, createRng, hex, pickSkewed } from './random'
import type { Rng } from './random'

export type LiveHandler = (event: HoneypotEvent) => void

let rng: Rng | undefined
let decoy: Rng | undefined
let startedAt = 0

/** Weighted by each sensor's share of the day's traffic. */
function pickSensor(r: Rng) {
  const total = FLEET.reduce((sum, s) => sum + s.perDay, 0)
  let roll = r() * total
  for (const spec of FLEET) {
    roll -= spec.perDay
    if (roll <= 0) return spec
  }
  return FLEET[0]
}

/** One new event, appended to the shared event set. */
export function nextLiveEvent(silent: ReadonlySet<string>): HoneypotEvent | undefined {
  rng ??= createRng(0x11fe)
  decoy ??= createRng(0x11fd)
  if (startedAt === 0) startedAt = Date.now()
  const spec = pickSensor(rng)
  // A silent sensor sends nothing: the stream is where silence shows.
  if (silent.has(spec.id)) return undefined
  const source = pickSkewed(rng, SOURCES)
  const timestamp = new Date(MOCK_NOW + (Date.now() - startedAt)).toISOString()
  const event = eventFrom(spec, source, hex(rng, 12), timestamp, rng, decoy)
  EVENTS.unshift(event)
  const sensor = SENSORS.find((s) => s.id === spec.id)
  if (sensor) {
    sensor.eventsLast24h += 1
    sensor.lastSeen = timestamp
  }
  source.events += 1
  source.lastSeen = timestamp
  return event
}
