// The browser's end of every server function call: it carries the CSRF
// header (server/origin.ts), and a 401 — the session expired or was
// signed out elsewhere — sends the operator to sign in once, then back to
// the page they were on. Concurrent calls failing together start one
// sign-in, not one each; a 401 on a sign-in page itself never loops.
import { CSRF_HEADER } from '#/server/origin'

type Here = Pick<Location, 'pathname' | 'search' | 'hash' | 'assign'>

let reauthing = false

/** Starts the one sign-in; false when one is already under way or this is
 * a sign-in page. */
export function beginReauth(here: Here = window.location): boolean {
  if (reauthing || here.pathname.startsWith('/auth/')) return false
  reauthing = true
  here.assign(`/auth/login?return_to=${encodeURIComponent(here.pathname + here.search + here.hash)}`)
  return true
}

/** For tests: forget a sign-in under way. */
export const resetReauth = () => {
  reauthing = false
}

export const sessionAwareFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  headers.set(CSRF_HEADER, '1')
  const response = await fetch(input, { ...init, headers })
  if (response.status === 401 && typeof window !== 'undefined') beginReauth()
  return response
}
