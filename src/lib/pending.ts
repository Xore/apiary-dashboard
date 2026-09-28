// A page is its own pending state: the route's pendingComponent is the page
// component itself, rendering while the loader runs. The router hands it no
// loader data then, so the page reads its data through this and draws
// skeletons for what is missing: its own layout, filled in as much as is
// known (title, tabs, filters, columns, the URL's ids), never a generic one.
//
// A browser's first load gets that skeleton from the server (lib/pageSsr), so
// the first client render must be the skeleton too, even when the loader has
// already answered: the data shows from the render after hydration.
import { useHydrated } from '@tanstack/react-router'

export function orPending<T>(data: T): T | undefined {
  const hydrated = useHydrated()
  return typeof window === 'undefined' || hydrated ? data : undefined
}
