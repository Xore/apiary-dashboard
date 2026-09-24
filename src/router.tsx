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
    // A slow load shows the page's shape after a beat instead of freezing
    // on the previous page.
    defaultPendingComponent: PagePending,
    defaultPendingMs: 300,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
