// The session and preferences the layout's navigation guard last read, kept
// in the browser for a short while: a navigation must not wait on them
// behind a slow page's requests, or the whole shell gives way to a pending
// state. Every data call still checks the session on the server, and an
// expired session shows its own page.
import type { Preferences, SessionUser } from '#/data/types'

const SHELL_READ_MS = 30_000
let last: { at: number; user: SessionUser; prefs: Preferences } | undefined

/** The last read, if recent and in the browser. */
export function recentShellRead() {
  return typeof window !== 'undefined' && last && Date.now() - last.at < SHELL_READ_MS ? last : undefined
}

export function rememberShellRead(user: SessionUser, prefs: Preferences) {
  if (typeof window !== 'undefined') last = { at: Date.now(), user, prefs }
}

/** After a change to either (a saved preference): read them again. */
export function forgetShellRead() {
  last = undefined
}
