import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PANE_IDS } from '#/components/SettingsDialog'
import type { PaneId } from '#/components/SettingsDialog'
import { ShellAppShell } from '#/components/ShellAppShell'
import { getSessionUser } from '#/data/queries'

export const Route = createFileRoute('/_layout')({
  // `?settings=<pane>` opens the settings modal over any page.
  validateSearch: (search: Record<string, unknown>): { settings?: PaneId } => ({
    settings: PANE_IDS.includes(search.settings as PaneId) ? (search.settings as PaneId) : undefined,
  }),
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
