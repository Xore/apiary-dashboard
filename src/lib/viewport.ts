// Whether this browser gets the narrow (drawer) layout, known on the server
// too so the first render is already the right one: the browser leaves its
// width in a cookie; before that, the User-Agent says whether it is a phone
// or tablet.
import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie, getRequestHeader } from '@tanstack/react-start/server'

/** Below this width the side navigation becomes a drawer (Astryx `lg`). */
export const NARROW_BELOW = 1024

const WIDTH_COOKIE = 'apiary.vw'
const MOBILE_UA = /Mobi|Android|iPhone|iPad|iPod/i

export const isNarrowViewport = createIsomorphicFn()
  .server(() => {
    const width = Number(getCookie(WIDTH_COOKIE))
    return width > 0 ? width < NARROW_BELOW : MOBILE_UA.test(getRequestHeader('user-agent') ?? '')
  })
  .client(() => window.innerWidth < NARROW_BELOW)

/** Keep the cookie current as the window changes size. */
export function rememberViewportWidth(): () => void {
  const write = () => {
    document.cookie = `${WIDTH_COOKIE}=${window.innerWidth}; path=/; max-age=31536000; samesite=lax`
  }
  write()
  let timer: ReturnType<typeof setTimeout> | undefined
  const onResize = () => {
    clearTimeout(timer)
    timer = setTimeout(write, 250)
  }
  window.addEventListener('resize', onResize)
  return () => {
    clearTimeout(timer)
    window.removeEventListener('resize', onResize)
  }
}
