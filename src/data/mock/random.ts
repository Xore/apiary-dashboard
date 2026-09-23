// Deterministic randomness so SSR and hydration render identical mock data.

/** Fixed mock clock; every fixture timestamp is relative to it. */
export const MOCK_NOW = Date.parse('2026-09-23T12:00:00Z')

export type Rng = () => number

/** mulberry32: small, fast, seedable PRNG returning [0, 1). */
export function createRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function int(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}

/** Pick with a bias toward the head of the list (Zipf-like). */
export function pickSkewed<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() ** 2.2 * items.length)]
}

export function hex(rng: Rng, length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += Math.floor(rng() * 16).toString(16)
  return out
}

export function isoMinutesAgo(minutes: number): string {
  return new Date(MOCK_NOW - minutes * 60_000).toISOString()
}
