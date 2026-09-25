import { useEffect } from 'react'
import { createFileRoute, redirect, retainSearchParams, useLocation, useNavigate } from '@tanstack/react-router'
import { DEFAULT_RANGE, isRange } from '#/lib/range'
import { usePreferences } from '#/lib/prefs'
import type { RangeId } from '#/lib/range'
import { PANE_IDS } from '#/components/SettingsDialog'
import type { PaneId } from '#/components/SettingsDialog'
import { ShellAppShell } from '#/components/ShellAppShell'
import { getPreferences, getSessionUser, getShellConfig } from '#/data/queries'
import { isScenario, setMockScenario } from '#/data/scenario'
import type { MockScenario } from '#/data/scenario'

export const Route = createFileRoute('/_layout')({
  // `?settings=<pane>` opens the settings modal over any page; `?range=` is
  // the app-wide time range and `?mock=` the mock backend scenario, both
  // kept on every navigation.
  validateSearch: (search: Record<string, unknown>): { settings?: PaneId; range?: RangeId; mock?: MockScenario } => ({
    settings: PANE_IDS.includes(search.settings as PaneId) ? (search.settings as PaneId) : undefined,
    range: isRange(search.range) && search.range !== '24h' ? search.range : undefined,
    mock: isScenario(search.mock) && search.mock !== 'normal' ? search.mock : undefined,
  }),
  search: { middlewares: [retainSearchParams(['range', 'mock'])] },
  // Before any loader below runs, so every query of this navigation sees it.
  beforeLoad: async ({ search, location }) => {
    setMockScenario(search.mock)
    const prefs = await getPreferences()
    // A fresh page load: every server render is one; in the browser only
    // the very first navigation (hydration of that same page) is.
    const fresh = typeof window === 'undefined' || firstClientLoad
    firstClientLoad = false
    const bare = location.searchStr === '' || location.searchStr === '?'
    if (fresh && bare && location.pathname === '/' && prefs.landing !== '/') throw redirect({ href: prefs.landing })
    if (fresh && search.range === undefined && prefs.defaultWindow !== DEFAULT_RANGE && isRange(prefs.defaultWindow)) {
      throw redirect({ href: `${location.pathname}${bare ? '?' : `${location.searchStr}&`}range=${prefs.defaultWindow}` })
    }
    // "Remember filters": a list opened without any comes back as it was left.
    if (!fresh && bare && prefs.rememberFilters) {
      const saved = rememberedSearch(location.pathname)
      if (saved) throw redirect({ href: `${location.pathname}${saved}` })
    }
  },
  loader: async () => {
    const [user, config] = await Promise.all([getSessionUser(), getShellConfig()])
    return { user, config }
  },
  component: LayoutComponent,
})

let firstClientLoad = true

const REMEMBER_KEY = (path: string) => `apiary.filters:${path}`

function rememberedSearch(path: string): string | null {
  try {
    return sessionStorage.getItem(REMEMBER_KEY(path))
  } catch {
    return null
  }
}

function LayoutComponent() {
  const { user, config } = Route.useLoaderData()
  const prefs = usePreferences()
  const location = useLocation()
  // Keep each page's last filters for "remember filters" (this tab only).
  useEffect(() => {
    if (!prefs?.rememberFilters) return
    const kept = new URLSearchParams(location.searchStr)
    for (const key of ['settings', 'mock', 'range']) kept.delete(key)
    try {
      if ([...kept].length) sessionStorage.setItem(REMEMBER_KEY(location.pathname), `?${kept.toString()}`)
      else sessionStorage.removeItem(REMEMBER_KEY(location.pathname))
    } catch {
      /* storage unavailable: nothing is remembered */
    }
  }, [prefs?.rememberFilters, location.pathname, location.searchStr])
  const { settings } = Route.useSearch()
  // Router-level navigate: '.' is the current page, so the modal opens over
  // it (the route-bound one would resolve '.' to this layout's '/').
  const navigate = useNavigate()
  const setSettings = (pane: PaneId | undefined) =>
    void navigate({ to: '.', search: (prev: Record<string, unknown>) => ({ ...prev, settings: pane }) })
  return <ShellAppShell user={user} config={config} settingsPane={settings} onSettingsPane={setSettings} />
}
