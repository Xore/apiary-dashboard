// A page is its own pending state: the route's pendingComponent is the page
// component itself, rendering while the loader runs. The router hands it no
// loader data then, so the page reads its data through this and draws
// skeletons for what is missing: its own layout, filled in as much as is
// known (title, tabs, filters, columns, the URL's ids), never a generic one.
export const orPending = <T,>(data: T): T | undefined => data
