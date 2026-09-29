// The Start instance: middleware every server function runs behind. The
// same-origin rule comes first (CSRF): a call that can change state must
// come from a page of this dashboard. Who may run which query is decided
// per call on the server (src/data/backend.ts, src/server/authorize.ts),
// where the query's name is known.
import { createMiddleware, createStart } from '@tanstack/react-start'

const sameOrigin = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const [{ getRequest }, { crossOriginResponse, isSameOriginRequest }] = await Promise.all([import('@tanstack/react-start/server'), import('./server/origin')])
  if (!isSameOriginRequest(getRequest())) throw crossOriginResponse()
  return next()
})

// Every HTTP request runs inside its Content-Security-Policy nonce's scope
// (lib/cspNonce.server.ts), before anything renders.
const csp = createMiddleware({ type: 'request' }).server(async ({ next }) => {
  const { withCspScope } = await import('./lib/cspNonce.server')
  return withCspScope(next)
})

export const startInstance = createStart(() => ({ requestMiddleware: [csp], functionMiddleware: [sameOrigin] }))
