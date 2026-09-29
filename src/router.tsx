import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary'
import { NotFound } from './components/NotFound'
import { PagePending } from './components/PagePending'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  // The request's CSP nonce (lib/cspNonce.server.ts), read per router: the
  // server makes one per request, inside that request's scope. The global is
  // absent in the browser, so this is undefined there.
  const csp = (globalThis as typeof globalThis & { __APIARY_CSP__?: { current?: () => string | undefined } }).__APIARY_CSP__
  const router = createTanStackRouter({
    routeTree,
    ssr: { nonce: csp?.current?.() },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => <NotFound />,
    defaultErrorComponent: DefaultCatchBoundary,
    // Every navigation shows the page's own skeleton at once while its data
    // loads (each page is its own pendingComponent; this is the fallback),
    // held long enough to read as loading rather than a flicker. A full load
    // does the same from the server (lib/pageSsr).
    defaultPendingComponent: PagePending,
    defaultPendingMs: 0,
    defaultPendingMinMs: 250,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
