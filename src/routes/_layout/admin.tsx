// /admin: the dashboard's administration, one panel per tab: branding,
// defaults, honeypot operations, users, services, report templates,
// canarytokens, storage, dead letters, configuration history and the audit
// log. Admins only; the settings dialog keeps what is personal.
import { createFileRoute, redirect } from '@tanstack/react-router'
import { PageFrame } from '#/components/PageFrame'
import { AdminPanelView } from '#/components/SettingsDialog'
import { SettingsPanelHeading } from '#/components/settings/parts'
import { PANEL_GROUPS } from '#/components/settings/registry'
import type { PaneId } from '#/components/settings/registry'
import { searchTabs } from '#/components/ViewTabs'

const ADMIN_PANES = PANEL_GROUPS[1].panels

export const Route = createFileRoute('/_layout/admin')({
  staticData: { viewTabs: searchTabs({ label: 'Administration', param: 'pane', tabs: () => ADMIN_PANES.map((panel) => ({ id: panel.id, label: panel.label })) }) },
  validateSearch: (search: Record<string, unknown>): { pane?: PaneId } => ({
    pane: ADMIN_PANES.some((panel) => panel.id === search.pane) ? (search.pane as PaneId) : undefined,
  }),
  // A viewer has no administration to see; the server refuses every write
  // here for them anyway.
  beforeLoad: ({ context }) => {
    if (!context.user.roles.includes('admin')) throw redirect({ to: '/' })
  },
  component: AdminPage,
})

function AdminPage() {
  const { pane = ADMIN_PANES[0].id } = Route.useSearch()
  return (
    <PageFrame title="Administration" description="Settings that affect everyone: branding, defaults, operations, users and the record of changes.">
      <SettingsPanelHeading panel={pane} />
      <AdminPanelView pane={pane} />
    </PageFrame>
  )
}
