import { createFileRoute, redirect } from '@tanstack/react-router'
import { PANE_IDS } from '#/components/SettingsDialog'
import type { PaneId } from '#/components/SettingsDialog'

// Settings is a modal over the current page; this path stays as a deep link
// (/settings?pane=services) and opens it over the Overview.
export const Route = createFileRoute('/_layout/settings')({
  validateSearch: (search: Record<string, unknown>): { pane?: PaneId } => ({
    pane: PANE_IDS.includes(search.pane as PaneId) ? (search.pane as PaneId) : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search: { settings: search.pane ?? 'account' } })
  },
})
