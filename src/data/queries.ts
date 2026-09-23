// The data seam. Route loaders call these functions and nothing else; today
// they resolve mock fixtures, later each becomes a createServerFn call to the
// backend with the same signature.
import { EVENTS, MOCK_USER, PASSWORDS, SENSORS, SOURCES, USERNAMES } from './mock/fixtures'
import { MOCK_NOW, createRng } from './mock/random'
import type {
  CountRow,
  HoneypotEvent,
  Kpi,
  OverviewData,
  Protocol,
  SessionUser,
  TimeBucket,
} from './types'

const HOUR = 3_600_000

/** Simulated backend latency, e.g. VITE_MOCK_LATENCY_MS=800 to exercise
 * pending states. */
async function mockDelay(): Promise<void> {
  const ms = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 0)
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))
}

function hourIndex(timestamp: string): number {
  return 23 - Math.floor((MOCK_NOW - Date.parse(timestamp)) / HOUR)
}

function hourly(events: HoneypotEvent[]): number[] {
  const counts = new Array<number>(24).fill(0)
  for (const event of events) counts[hourIndex(event.timestamp)] += 1
  return counts
}

function countBy(values: Array<string | undefined>, limit: number): CountRow[] {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (value !== undefined) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ id: label, label, count }))
}

function kpi(id: string, label: string, events: HoneypotEvent[], value = events.length): Kpi {
  // Previous-period value is synthetic: ±35% around the current value.
  const rng = createRng(id.length * 7919 + value)
  return { id, label, value, previous: Math.round(value * (0.65 + rng() * 0.7)), trend: hourly(events) }
}

export async function getSessionUser(): Promise<SessionUser> {
  await mockDelay()
  return MOCK_USER
}

export async function getOverview(): Promise<OverviewData> {
  await mockDelay()
  const logins = EVENTS.filter((e) => e.type === 'login.success')
  const downloads = EVENTS.filter((e) => e.type === 'file.download')
  const firstPerSource = [...new Map(EVENTS.map((e) => [e.srcIp, e])).values()]
  const firstPerSession = [...new Map(EVENTS.map((e) => [e.sessionId, e])).values()]

  const protocolTotals = countBy(EVENTS.map((e) => e.protocol), 8)
  const topProtocols = protocolTotals.slice(0, 5).map((row) => row.label as Protocol)
  const timeline: TimeBucket[] = Array.from({ length: 24 }, (_, i) => ({
    time: new Date(MOCK_NOW - (24 - i) * HOUR).toISOString(),
    total: 0,
    byProtocol: {},
  }))
  for (const event of EVENTS) {
    const bucket = timeline[hourIndex(event.timestamp)]
    bucket.total += 1
    bucket.byProtocol[event.protocol] = (bucket.byProtocol[event.protocol] ?? 0) + 1
  }

  return {
    generatedAt: new Date(MOCK_NOW).toISOString(),
    kpis: [
      kpi('events', 'Events', EVENTS),
      kpi('sources', 'Unique sources', firstPerSource),
      kpi('sessions', 'Sessions', firstPerSession),
      kpi('logins', 'Successful logins', logins),
      kpi('payloads', 'Payloads captured', downloads),
    ],
    timeline,
    topProtocols,
    topSources: [...SOURCES].sort((a, b) => b.events - a.events).slice(0, 8),
    topCountries: countBy(EVENTS.map((e) => e.country), 8),
    topUsernames: countBy(EVENTS.map((e) => e.username), USERNAMES.length).slice(0, 8),
    topPasswords: countBy(EVENTS.map((e) => e.password), PASSWORDS.length).slice(0, 8),
    recentEvents: EVENTS.slice(0, 12),
    sensors: SENSORS,
  }
}
