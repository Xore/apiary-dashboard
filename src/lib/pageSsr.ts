// How a page is rendered on the server. A browser opening a page gets the
// shell and the page's own skeleton at once, and the data loads in the
// browser, so every page shows its layout while it loads, on a full load as
// on a navigation. Anything that is not a browser navigation (curl, link
// previews, the smoke crawl) gets the complete page from the server, with
// its real status: a 404 for a missing entity, the outage state, redirects.
//
// A browser navigation is the one request that carries
// `Sec-Fetch-Dest: document`; fetch() and non-browser clients never send it.
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

const isBrowserNavigation = createIsomorphicFn()
  .server(() => getRequestHeader('sec-fetch-dest') === 'document')
  .client(() => true)

/** Every page route's `ssr`: skeleton first for browsers, the whole page
 * for everything else. */
export const pageSsr = (): boolean => !isBrowserNavigation()
