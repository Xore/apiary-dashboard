// How a page is rendered on the server. A browser opening a page gets the
// shell and the page's own skeleton at once, and the data loads in the
// browser, so every page shows its layout while it loads, on a full load as
// on a navigation. Anything that is not a browser navigation (curl, link
// previews, the smoke crawl) gets the complete page from the server, with
// its real status: a 404 for a missing entity, the outage state, redirects.
//
// A browser navigation carries `Sec-Fetch-Dest: document`, but browsers send
// that only to secure origins: over plain HTTP (the dev server opened from
// another machine) it is missing, and the page was rendered complete on the
// server, its charts drawn before the screen's width was known. Browsers
// also send `Upgrade-Insecure-Requests: 1` on every navigation, plain HTTP
// included; fetch() and non-browser clients send neither.
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

export const navigatesAsBrowser = (header: (name: string) => string | undefined): boolean =>
  header('sec-fetch-dest') === 'document' || header('upgrade-insecure-requests') === '1'

const isBrowserNavigation = createIsomorphicFn()
  .server(() => navigatesAsBrowser(getRequestHeader))
  .client(() => true)

/** Every page route's `ssr`: skeleton first for browsers, the whole page
 * for everything else. */
export const pageSsr = (): boolean => !isBrowserNavigation()
