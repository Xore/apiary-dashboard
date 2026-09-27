// The command palette's search: the dashboard's pages at once, and the
// entities a query names (source IPs, sessions, commands, credentials,
// payloads) from searchAll, grouped, as the canonical palette searches.
import type { SearchSource, SearchableItem } from '@astryxdesign/core/Typeahead'
import { searchAll } from '#/data/queries'

export type PaletteItem = SearchableItem<{ group: string; href: string }>

export type PaletteSource = SearchSource<PaletteItem> & {
  /** Where the entity the palette last offered under `id` leads. */
  lastHref: (id: string) => string | undefined
}

export function paletteSource(pages: PaletteItem[]): PaletteSource {
  let latest = 0
  const offered = new Map<string, string>()
  const pageMatches = (query: string) => {
    const q = query.trim().toLowerCase()
    return q ? pages.filter((p) => p.label.toLowerCase().includes(q)) : pages
  }
  return {
    lastHref: (id) => offered.get(id),
    bootstrap: () => pages,
    async search(query) {
      const own = ++latest
      const matches = pageMatches(query)
      if (query.trim().length < 2) return matches
      try {
        const groups = await searchAll(query)
        // A later keystroke already asked again: this answer is stale.
        if (own !== latest) return matches
        // Several entities can lead to one page (commands to the history
        // search), so the id is the entity and the target rides along.
        const entities = groups.flatMap((group) =>
          group.items.map((item) => ({ id: `${group.id}:${item.label}`, label: `${item.label} · ${item.detail}`, auxiliaryData: { group: group.title, href: item.href } })),
        )
        offered.clear()
        for (const entity of entities) offered.set(entity.id, entity.auxiliaryData.href)
        return [...matches, ...entities]
      } catch {
        return matches
      }
    },
  }
}
