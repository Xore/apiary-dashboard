// Pure helpers both sides of the data seam use: the page (in the browser
// and during SSR) and the mock backend. Nothing here holds or reads data, so
// importing it never pulls the mock into the browser bundle.
import { MOCK_NOW } from './mock/random'
import type { AlertGroup } from './types'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const RANGE_MS: Record<string, number> = { '1h': HOUR, '6h': 6 * HOUR, '24h': DAY, '7d': 7 * DAY, '30d': 30 * DAY }

/** The mock clock: fixture timestamps are relative to it. */
export const mockNow = () => MOCK_NOW

/** Whether a timestamp falls inside an app-wide range (`all` for any). */
export function inRange(at: string, range?: string): boolean {
  if (range === 'all') return true
  return MOCK_NOW - Date.parse(at) <= (RANGE_MS[range ?? '24h'] ?? DAY)
}

/** An alert group's key: its id without the acknowledged flag. */
export const alertKeyOf = (group: AlertGroup) => group.id.replace(/\|(true|false)$/, '')

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%^&*'

/** A random password from an alphabet without look-alike characters. */
export function generatePassword(length = 16): string {
  return Array.from(crypto.getRandomValues(new Uint32Array(length)), (n) => PASSWORD_ALPHABET[n % PASSWORD_ALPHABET.length]).join('')
}

/** Credentials, tokens and cookies out of free text (problem reports). */
export function redact(text: string): string {
  return text
    .replace(/\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}/g, '[redacted jwt]')
    .replace(/\b(bearer)\s+[\w.~+/-]{8,}=*/gi, '$1 [redacted]')
    .replace(/\b(authorization|cookie|set-cookie|x-api-key|api[_-]?key|token|access_token|refresh_token|session|password|passwd|secret)(["']?\s*[:=]\s*["']?)[^\s"'&,;}]+/gi, '$1$2[redacted]')
}
