import { createFileRoute, retainSearchParams, useNavigate } from '@tanstack/react-router'
import { isRange } from '#/lib/range'
import type { RangeId } from '#/lib/range'
import { PANE_IDS } from '#/components/SettingsDialog'
import type { PaneId } from '#/components/SettingsDialog'
import { ShellAppShell } from '#/components/ShellAppShell'
import { getSessionUser } from '#/data/queries'
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
  beforeLoad: ({ search }) => setMockScenario(search.mock),
  loader: () => getSessionUser(),
  component: LayoutComponent,
})

function LayoutComponent() {
  const user = Route.useLoaderData()
  const { settings } = Route.useSearch()
  // Router-level navigate: '.' is the current page, so the modal opens over
  // it (the route-bound one would resolve '.' to this layout's '/').
  const navigate = useNavigate()
  const setSettings = (pane: PaneId | undefined) =>
    void navigate({ to: '.', search: (prev: Record<string, unknown>) => ({ ...prev, settings: pane }) })
  return <ShellAppShell user={user} settingsPane={settings} onSettingsPane={setSettings} />
}
