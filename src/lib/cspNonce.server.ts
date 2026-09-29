// The Content-Security-Policy, with a fresh nonce per request (#5; APIARY
// #2028): a second line of defence behind escaping, for pages that render
// attacker-controlled bytes (event details, commands, payload previews).
//
// start.ts's request middleware runs each request inside withCspScope: the
// header goes on the response, and the rest of the pipeline runs in an
// AsyncLocalStorage scope holding the nonce. The router reads it from there
// (router.tsx, through globalThis: that file is in both bundles and cannot
// import node:async_hooks) into `ssr.nonce`, which is what puts the nonce on
// every script tag the framework and react-dom emit.
//
// Only these directives: script-src is the guarantee ('self' for Vite's route
// chunks, the nonce for every inline script); object-src, base-uri and
// frame-ancestors cost nothing. No default-src: the attack map loads its
// tiles off-origin, and widening that is a decision of its own.
import { randomBytes } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage<string>()

/** What router.tsx reads through globalThis. */
export type CspRuntime = { readonly current?: () => string | undefined }

const globalScope = globalThis as typeof globalThis & { __APIARY_CSP__?: CspRuntime }
// Assigned, not ??=: a reloaded module (dev) must publish its own store.
globalScope.__APIARY_CSP__ = { current: () => storage.getStore() }

export function buildCsp(nonce: string): string {
  return [`script-src 'self' 'nonce-${nonce}'`, "object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'"].join('; ')
}

/** Once per HTTP request, before anything renders: the header, then the
 * rest of the pipeline inside the nonce's scope (run(), not enterWith(), so
 * everything `next` spawns sees it). */
export async function withCspScope<T>(restOfPipeline: () => T): Promise<Awaited<T>> {
  const { setResponseHeader } = await import('@tanstack/react-start/server')
  const nonce = randomBytes(16).toString('base64')
  setResponseHeader('content-security-policy', buildCsp(nonce))
  return storage.run(nonce, restOfPipeline) as Awaited<T>
}
