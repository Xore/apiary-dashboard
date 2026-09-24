import { useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Icon } from '@astryxdesign/core/Icon'
import type { IconType } from '@astryxdesign/core/Icon'
import { TopNavItem, TopNavMenu } from '@astryxdesign/core/TopNav'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { formatNumber } from '#/lib/format'

export type ViewTab = {
  id: string
  label: string
  /** Shown as "Label (n)" once the page's data has loaded. */
  count?: number
  /** Sub-sections: the tab becomes a menu in the top bar listing them. */
  sections?: ReadonlyArray<{ id: string; label: string; icon?: IconType }>
}

type ViewTabsInput = {
  params: Record<string, string>
  search: Record<string, unknown>
  pathname: string
  /** The declaring route's loader data; undefined while it is still loading. */
  data: unknown
}

export type ViewTabsModel = {
  label: string
  tabs: ViewTab[]
  value: string
  /** The active tab's current sub-section, when it has sections. */
  section?: string
  /** Where choosing a tab (or one of its sections) goes: a path, or a change
   * to the search params. */
  href?: (id: string) => string
  search?: (id: string, section?: string) => Record<string, unknown>
}

/** Declared on a route as `staticData.viewTabs`. A pure function of the
 * route's own state, so the top bar can draw the tabs during server render
 * and the moment a navigation starts, before the page's data arrives. */
export type ViewTabsFn = (input: ViewTabsInput) => ViewTabsModel

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    viewTabs?: ViewTabsFn
  }
}

/** Tabs kept in one search param, e.g. `?view=`; the first tab is the
 * default and is left out of the URL. A tab's sections live in
 * `sectionParam` (e.g. `?section=`), again with the first as default. */
export function searchTabs({ label, param, sectionParam = 'section', tabs }: { label: string; param: string; sectionParam?: string; tabs: (data: unknown, search: Record<string, unknown>) => ViewTab[] }): ViewTabsFn {
  return ({ search, data }) => {
    const list = tabs(data, search)
    const current = typeof search[param] === 'string' ? search[param] : undefined
    const value = list.some((tab) => tab.id === current) ? current! : list[0].id
    const sections = list.find((tab) => tab.id === value)?.sections
    const rawSection = search[sectionParam]
    return {
      label,
      tabs: list,
      value,
      section: sections ? (sections.find((x) => x.id === rawSection)?.id ?? sections[0].id) : undefined,
      search: (id, section) => {
        const own = list.find((tab) => tab.id === id)?.sections
        return { [param]: id === list[0].id ? undefined : id, [sectionParam]: own && section && section !== own[0].id ? section : undefined }
      },
    }
  }
}

/** The section a search value selects within a tab's sections, falling back
 * to the first; for pages that render the sections their tab declares. */
export const sectionOf = (sections: ReadonlyArray<{ id: string }>, value: unknown) => sections.find((s) => s.id === value)?.id ?? sections[0].id

function safeDecode(path: string): string {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

/** Tabs as route segments under an entity's base path (epic #25): the first
 * tab is the base path itself, the rest are `<base>/<id>`. */
export function entityTabs({ label, basePath, tabs }: { label: string; basePath: (params: Record<string, string>) => string; tabs: (data: unknown) => ViewTab[] }): ViewTabsFn {
  return ({ params, pathname, data }) => {
    const base = basePath(params)
    const list = tabs(data)
    const path = safeDecode(pathname)
    const decodedBase = safeDecode(base)
    const rest = path.startsWith(decodedBase) ? path.slice(decodedBase.length).replace(/^\//, '') : ''
    return {
      label,
      tabs: list,
      value: list.find((tab) => tab.id === rest.split('/')[0])?.id ?? list[0].id,
      href: (id) => (id === list[0].id ? base : `${base}/${id}`),
    }
  }
}

/** The tabs of the deepest route that declares them, drawn as top-bar nav
 * items: a plain tab is a link, a tab with sections is a hover menu listing
 * them (after the Astryx TopNav "Multiple Dropdowns" block). The bar matches
 * the current location itself, and the location switches as soon as a
 * navigation starts, so the tabs show up before the new page's data arrives
 * (and are part of the server render). */
export function ViewTabsBar() {
  const router = useRouter()
  const location = useRouterState({ select: (state) => state.location })
  const committed = useRouterState({ select: (state) => state.matches })
  const [routes, params] = router.getMatchedRoutes(location.pathname)
  const route = [...routes].reverse().find((r) => r.options.staticData?.viewTabs)
  if (!route) return null
  // Counts come from the route's loader data once that exact match loaded.
  const match = committed.find((m) => m.routeId === route.id && JSON.stringify(m.params) === JSON.stringify(pick(params, m.params)))
  const model = route.options.staticData!.viewTabs!({
    params,
    search: location.search,
    pathname: location.pathname,
    data: match?.status === 'success' ? match.loaderData : undefined,
  })
  if (model.tabs.length < 2) return null

  // Real hrefs, so every entry is a link (new tab, copy link, prefetch).
  const hrefOf = (id: string, section?: string) =>
    model.href
      ? model.href(id)
      : router.buildLocation({ to: location.pathname, search: (prev: Record<string, unknown>) => ({ ...prev, ...model.search?.(id, section) }) } as never).href
  // Menu items render as plain anchors; route their clicks client-side, but
  // leave modified clicks (new tab/window) to the browser.
  const go = (href: string) => (event?: MouseEvent) => {
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)) return
    event?.preventDefault()
    void router.navigate({ href })
  }
  return <TabStrip model={model} hrefOf={hrefOf} go={go} />
}

// Keeps each entry on one line at its natural width.
const ITEM_STYLE = { flexShrink: 0, whiteSpace: 'nowrap' } as const
// TopNavMenu has no selected state; this is TopNavItem's selected fill.
const ACTIVE_STYLE = { ...ITEM_STYLE, backgroundColor: 'var(--color-neutral)' } as const
// Room kept for the "More" menu when tabs overflow.
const MORE_WIDTH = 96

const labelOf = (tab: ViewTab) => (tab.count === undefined ? tab.label : `${tab.label} (${formatNumber(tab.count)})`)

/** The entries, as many as fit; the rest go into a trailing "More" menu. */
function TabStrip({ model, hrefOf, go }: { model: ViewTabsModel; hrefOf: (id: string, section?: string) => string; go: (href: string) => (event?: MouseEvent) => void }) {
  // TopNavMenu types onClick without the event, but passes it.
  const item = (title: string, href: string, icon: IconType, description?: string) => ({ title, href, description, icon: <Icon icon={icon} size="sm" />, onClick: go(href) })
  const stripRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(model.tabs.length)
  const labels = model.tabs.map(labelOf).join('|')

  // Measure every entry in an invisible copy, then keep what fits.
  useLayoutEffect(() => {
    const strip = stripRef.current
    const measure = measureRef.current
    if (!strip || !measure) return
    const compute = () => {
      const widths = [...measure.children].map((child) => child.getBoundingClientRect().width + 2)
      const available = strip.clientWidth
      // No layout (tests, before first paint): show everything.
      if (available === 0 || widths.reduce((a, b) => a + b, 0) <= available) return setFit(widths.length)
      let used = MORE_WIDTH
      let count = 0
      for (const width of widths) {
        if (used + width > available) break
        used += width
        count++
      }
      setFit(Math.max(1, count))
    }
    compute()
    const observer = new ResizeObserver(compute)
    observer.observe(strip)
    return () => observer.disconnect()
  }, [labels])

  const entry = (tab: ViewTab) => {
    const isActive = tab.id === model.value
    if (!tab.sections?.length) return <TopNavItem key={tab.id} label={labelOf(tab)} href={hrefOf(tab.id)} isSelected={isActive} style={ITEM_STYLE} />
    return (
      <TopNavMenu
        key={tab.id}
        label={labelOf(tab)}
        aria-current={isActive ? 'page' : undefined}
        style={isActive ? ACTIVE_STYLE : ITEM_STYLE}
        items={tab.sections.map((section) => item(section.label, hrefOf(tab.id, section.id), section.icon ?? ArrowRightIcon, isActive && section.id === model.section ? 'Showing now' : undefined))}
      />
    )
  }
  const shown = model.tabs.slice(0, fit)
  const rest = model.tabs.slice(fit)
  const restActive = rest.some((tab) => tab.id === model.value)

  return (
    <div ref={stripRef} style={{ position: 'relative', minWidth: 0, width: '100%' }}>
      <nav aria-label={model.label} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {shown.map(entry)}
        {rest.length > 0 && (
          <TopNavMenu
            label="More"
            aria-current={restActive ? 'page' : undefined}
            style={restActive ? ACTIVE_STYLE : ITEM_STYLE}
            items={rest.flatMap((tab) =>
              tab.sections?.length
                ? tab.sections.map((section) => item(`${tab.label}: ${section.label}`, hrefOf(tab.id, section.id), section.icon ?? ArrowRightIcon))
                : [item(labelOf(tab), hrefOf(tab.id), ArrowRightIcon, tab.id === model.value ? 'Showing now' : undefined)],
            )}
          />
        )}
      </nav>
      {/* The measuring copy: same entries, never seen or reachable. */}
      <div ref={measureRef} aria-hidden inert style={{ position: 'absolute', visibility: 'hidden', display: 'flex', gap: 2, top: 0, left: 0, pointerEvents: 'none' }}>
        {model.tabs.map((tab) =>
          tab.sections?.length ? <TopNavMenu key={tab.id} label={labelOf(tab)} items={[]} style={ITEM_STYLE} /> : <TopNavItem key={tab.id} label={labelOf(tab)} style={ITEM_STYLE} />,
        )}
      </div>
    </div>
  )
}

/** The subset of `all` with the keys of `like` (a match's own params). */
function pick(all: Record<string, string>, like: object): Record<string, string> {
  return Object.fromEntries(Object.keys(like).map((key) => [key, all[key]]))
}
