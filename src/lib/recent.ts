// "Recent investigations": the operator's last five targets, listed in the
// sidebar. Same storage key and entry shape ({kind, value}) as the Go shell
// and the canonical dashboard, so the list follows the operator across
// tiers during the transition. Links are built from the kind at render
// time and never stored, so a tampered entry cannot become a javascript:
// or off-site link.
import { useSyncExternalStore } from 'react'

export type RecentKind = 'ip' | 'session' | 'payload' | 'events-ip'
export type RecentEntry = { kind: RecentKind; value: string }

const KEY = 'hp-recent-investigations'
const MAX = 5
const listeners = new Set<() => void>()
let cache: RecentEntry[] | null = null

export function hrefForRecent(entry: RecentEntry): string | null {
  const value = encodeURIComponent(entry.value)
  switch (entry.kind) {
    case 'ip':
      return `/sources/${value}`
    case 'session':
      return `/sessions/${value}`
    case 'payload':
      return `/payloads/${value}`
    case 'events-ip':
      return `/events?ip=${value}`
    default:
      return null
  }
}

export function labelForRecent(entry: RecentEntry): string {
  if (entry.kind === 'session') return `session ${entry.value.slice(0, 12)}`
  if (entry.kind === 'payload') return `${entry.value.slice(0, 16)}…`
  if (entry.kind === 'events-ip') return `events of ${entry.value}`
  return entry.value
}

function safeEntry(entry: unknown): entry is RecentEntry {
  const candidate = entry as RecentEntry | null
  return !!candidate && typeof candidate.value === 'string' && candidate.value.length > 0 && candidate.value.length <= 128 && hrefForRecent(candidate) !== null
}

function read(): RecentEntry[] {
  if (cache) return cache
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    cache = Array.isArray(parsed) ? parsed.filter(safeEntry).slice(0, MAX) : []
  } catch {
    cache = []
  }
  return cache
}

function write(list: RecentEntry[]) {
  cache = list.slice(0, MAX).map((entry) => ({ kind: entry.kind, value: entry.value }))
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* storage unavailable: the in-memory list still renders */
  }
  for (const listener of listeners) listener()
}

const ENTITY: Array<[RegExp, RecentKind]> = [
  [/^\/sources\/([^/]+)/, 'ip'],
  [/^\/sessions\/([^/]+)/, 'session'],
  [/^\/payloads\/([0-9a-f]{64})/, 'payload'],
]

/** Called by the shell on every navigation, so no route needs wiring. */
export function recordRecentFromLocation(pathname: string, search: string) {
  let entry: RecentEntry | null = null
  for (const [pattern, kind] of ENTITY) {
    const match = pattern.exec(pathname)
    if (match) {
      entry = { kind, value: decodeURIComponent(match[1]) }
      break
    }
  }
  if (!entry && pathname === '/events') {
    const ip = new URLSearchParams(search).get('ip')
    if (ip) entry = { kind: 'events-ip', value: ip }
  }
  if (!entry || !safeEntry(entry)) return
  const current = entry
  write([current, ...read().filter((item) => item.kind !== current.kind || item.value !== current.value)])
}

const EMPTY: RecentEntry[] = []

export function useRecentInvestigations(): RecentEntry[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
    () => EMPTY,
  )
}
