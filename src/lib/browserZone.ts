// The operator's browser time zone, for the "browser" time zone preference.
// The browser knows it; the server only knows what the browser left in a
// cookie on an earlier visit (UTC before then). Resolving it in the root
// loader means server and client render the same times.
import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

const ZONE_COOKIE = 'apiary.tz'

const actualZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export const browserTimeZone = createIsomorphicFn()
  .server(() => getCookie(ZONE_COOKIE) ?? 'UTC')
  .client(actualZone)

/** Leave the zone for the server; true when it differs from what it rendered with. */
export function rememberBrowserZone(rendered: string): boolean {
  document.cookie = `${ZONE_COOKIE}=${encodeURIComponent(actualZone())}; path=/; max-age=31536000; samesite=lax`
  return rendered !== actualZone()
}
