// The list an entity page was opened from, so the page can offer prev/next
// through the same filtered, ordered rows and a way back to them. Kept in
// sessionStorage so it survives reloads of the entity page in that tab.

export type ListContext = {
  /** Where the list lives, with its filters (pathname + search). */
  listHref: string
  listTitle: string
  /** Entity page hrefs in list order. */
  hrefs: string[]
}

const KEY = 'apiary.list-context'

export function saveListContext(context: ListContext) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(context))
  } catch {
    // Storage can be unavailable (private mode); prev/next simply won't show.
  }
}

export function readListContext(): ListContext | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ListContext) : null
  } catch {
    return null
  }
}

/** Entity pages have tab sub-routes; compare on the entity's base path. */
export function basePathOf(href: string, entityBase: string): boolean {
  const path = href.split('?')[0]
  return path === entityBase || path.startsWith(`${entityBase}/`)
}
