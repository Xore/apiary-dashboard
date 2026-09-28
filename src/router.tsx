import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary'
import { NotFound } from './components/NotFound'
import { PagePending } from './components/PagePending'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
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
