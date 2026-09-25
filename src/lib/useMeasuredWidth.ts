// The rendered width of an element, for charts drawn at real pixel sizes
// (so their text stays one size on every screen) instead of a fixed canvas
// stretched to fit. Undefined until mounted: the server draws the natural
// size, scaled.
import { useLayoutEffect, useRef, useState } from 'react'

export function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState<number>()
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth || undefined)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}
