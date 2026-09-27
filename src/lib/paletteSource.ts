// The command palette's search: over everything. Pages and settings rows
// match at once, in the browser; every entity the dashboard shows (sources,
// networks, campaigns, alerts, anomalies, reports, tokens, runs…) comes from
// searchAll, a few per group, each group with a row to the search page.
import type { SearchSource, SearchableItem } from '@astryxdesign/core/Typeahead'
import { SETTINGS, isAdminPanel, panelOf } from '#/components/settings/registry'
import { searchAll } from '#/data/queries'

export type PaletteItem = SearchableItem<{ group: string; href: string }>

export type PaletteSource = SearchSource<PaletteItem> & {
  /** Where the entity the palette last offered under `id` leads. */
  lastHref: (id: string) => string | undefined
}

/** How many of each group the palette shows before "all N". */
export const PALETTE_GROUP_LIMIT = 5

/** Settings rows lead to their pane: personal ones open the settings modal
 * (`settings:<pane>`), administration ones the admin page, admins only. */
export function settingsItems(isAdmin: boolean): PaletteItem[] {
  return SETTINGS.filter((s) => isAdmin || !isAdminPanel(s.panel)).map((s) => ({
    id: `setting:${s.id}`,
    label: `${s.title} · ${panelOf(s.panel).label}`,
    auxiliaryData: { group: isAdminPanel(s.panel) ? 'Administration' : 'Settings', href: isAdminPanel(s.panel) ? `/admin?pane=${s.panel}` : `settings:${s.panel}` },
  }))
}

export function paletteSource(pages: PaletteItem[], isAdmin = false): PaletteSource {
  let latest = 0
  const offered = new Map<string, string>()
  const settings = settingsItems(isAdmin)
  const keywords = new Map(SETTINGS.map((s) => [`setting:${s.id}`, `${s.description} ${s.keywords ?? ''}`.toLowerCase()]))
  const localMatches = (query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return pages
    const matching = [...pages, ...settings].filter((p) => p.label.toLowerCase().includes(q) || keywords.get(p.id)?.includes(q))
    for (const item of matching) if (item.auxiliaryData && !item.id.startsWith('/')) offered.set(item.id, item.auxiliaryData.href)
    return matching
  }
  return {
    lastHref: (id) => offered.get(id),
    bootstrap: () => pages,
    async search(query) {
      const own = ++latest
      offered.clear()
      const matches = localMatches(query)
      if (query.trim().length < 2) return matches
      try {
        const groups = await searchAll(query, PALETTE_GROUP_LIMIT)
        // A later keystroke already asked again: this answer is stale.
        if (own !== latest) return matches
        const all = `/search?q=${encodeURIComponent(query.trim())}`
        // Several entities can lead to one page (commands to the history
        // search), so the id is the entity and the target rides along.
        const entities = groups.flatMap((group) => [
          ...group.items.map((item) => ({ id: `${group.id}:${item.label}:${item.href}`, label: `${item.label} · ${item.detail}`, auxiliaryData: { group: group.title, href: item.href } })),
          ...(group.total > group.items.length ? [{ id: `${group.id}:*`, label: `All ${group.total} in ${group.title}…`, auxiliaryData: { group: group.title, href: all } }] : []),
        ])
        for (const entity of entities) offered.set(entity.id, entity.auxiliaryData.href)
        return [...matches, ...entities]
      } catch {
        return matches
      }
    },
  }
}
