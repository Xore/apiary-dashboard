import { Tab, TabList } from '@astryxdesign/core/TabList'
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { formatNumber } from '#/lib/format'

export type ViewTab = {
  id: string
  label: string
  /** Shown as "Label (n)" once the page's data has loaded. */
  count?: number
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
  /** Where choosing a tab goes: a path, or a change to the search params. */
  href?: (id: string) => string
  search?: (id: string) => Record<string, unknown>
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
 * default and is left out of the URL. */
export function searchTabs({ label, param, tabs }: { label: string; param: string; tabs: (data: unknown, search: Record<string, unknown>) => ViewTab[] }): ViewTabsFn {
  return ({ search, data }) => {
    const list = tabs(data, search)
    const current = typeof search[param] === 'string' ? search[param] : undefined
    return {
      label,
      tabs: list,
      value: list.some((tab) => tab.id === current) ? current! : list[0].id,
      search: (id) => ({ [param]: id === list[0].id ? undefined : id }),
    }
  }
}

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

/** The strip the shell renders in the top bar: the tabs of the deepest route
 * that declares them. It matches the current location itself, and the
 * location switches as soon as a navigation starts, so the tabs show up
 * before the new page's data arrives (and are part of the server render). */
export function ViewTabsBar() {
  const router = useRouter()
  const navigate = useNavigate()
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
  return (
    <TabList
      value={model.value}
      onChange={(id) => {
        if (model.href) void navigate({ href: model.href(id) })
        else if (model.search) void navigate({ to: '.', search: (prev: Record<string, unknown>) => ({ ...prev, ...model.search!(id) }) })
      }}
      size="sm"
      aria-label={model.label}
    >
      {model.tabs.map((tab) => (
        <Tab key={tab.id} value={tab.id} label={tab.count === undefined ? tab.label : `${tab.label} (${formatNumber(tab.count)})`} />
      ))}
    </TabList>
  )
}

/** The subset of `all` with the keys of `like` (a match's own params). */
function pick(all: Record<string, string>, like: object): Record<string, string> {
  return Object.fromEntries(Object.keys(like).map((key) => [key, all[key]]))
}
