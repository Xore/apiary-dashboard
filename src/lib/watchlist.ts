// Pinned entities (epic #25). A per-viewer convenience kept in browser
// storage until the backend has user preferences; every access is guarded so
// a blocked or private-mode store only costs the pins.

export type Pin = { href: string; kind: string; title: string; pinnedAt: string }

const KEY = 'apiary.watchlist'
const listeners = new Set<() => void>()
let cache: Pin[] | undefined

function read(): Pin[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as Pin[]) : []
  } catch {
    cache = []
  }
  return cache
}

function write(pins: Pin[]) {
  cache = pins
  try {
    localStorage.setItem(KEY, JSON.stringify(pins))
  } catch {
    // Storage unavailable: the pin lasts until reload.
  }
  for (const listener of listeners) listener()
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return
    cache = undefined
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export const getPins = () => read()
const EMPTY: Pin[] = []
export const getServerPins = () => EMPTY

export function togglePin(pin: Omit<Pin, 'pinnedAt'>) {
  const pins = read()
  write(pins.some((p) => p.href === pin.href) ? pins.filter((p) => p.href !== pin.href) : [{ ...pin, pinnedAt: new Date().toISOString() }, ...pins])
}

export const unpin = (href: string) => write(read().filter((p) => p.href !== href))
