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

export const startInstance = createStart(() => ({ functionMiddleware: [sameOrigin] }))
