import { useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { AppShell } from '@astryxdesign/core/AppShell'
import { CommandPalette } from '@astryxdesign/core/CommandPalette'
import { ToastViewport } from '@astryxdesign/core/Toast'
import { createStaticSource } from '@astryxdesign/core/Typeahead'
import type { SessionUser, ShellConfig } from '#/data/types'
import { NAV_SECTIONS } from '#/lib/nav'
import { LiveToasts } from './LiveToasts'
import { ProblemReportButton } from './ProblemReportButton'
import { SettingsDialog } from './SettingsDialog'
import type { PaneId } from './SettingsDialog'
import { ShellBanners, ShellFooter } from './ShellNotices'
import { ShellSideNav } from './ShellSideNav'
import { ShellTopNav } from './ShellTopNav'

// Pages without a sidebar entry stay reachable from the palette.
const UNLISTED = [
  { id: '/search', label: 'Search everything' },
  { id: '/settings', label: 'Settings' },
  { id: '/dead-letters', label: 'Ingest dead letters' },
  { id: '/problem-reports', label: 'Problem reports' },
]

const PAGES = [
  ...NAV_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      id: item.to,
      label: item.label,
      auxiliaryData: { group: section.label },
    })),
  ),
  ...UNLISTED.map((page) => ({ ...page, auxiliaryData: { group: 'More' } })),
]

/** The single application shell: one topbar, one sidebar, one content
 * region, and the global command palette. */
type ShellProps = {
  user: SessionUser
  config: ShellConfig
  /** The open settings pane, if the settings modal is showing. */
  settingsPane?: PaneId
  onSettingsPane: (pane: PaneId | undefined) => void
}

export function ShellAppShell({ user, config, settingsPane, onSettingsPane }: ShellProps) {
  const navigate = useNavigate()
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const searchSource = useMemo(() => createStaticSource(PAGES), [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    // Toasts top right, under the top bar: the bottom corners belong to the
    // account menu and the report-a-problem button.
    <ToastViewport position="topEnd" inset={{ top: 64, end: 16 }} maxVisible={4}>
      <AppShell
        contentPadding={0}
        topNav={<ShellTopNav config={config} onOpenPalette={() => setIsPaletteOpen(true)} />}
        sideNav={<ShellSideNav user={user} config={config} onOpenSettings={() => onSettingsPane('account')} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <ShellBanners config={config} />
          <div style={{ flex: 1, minHeight: 0 }}>
            <Outlet />
          </div>
          <ShellFooter config={config} />
        </div>
      </AppShell>
      <CommandPalette
        isOpen={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
        searchSource={searchSource}
        label="Go to page"
        onValueChange={(to) => {
          setIsPaletteOpen(false)
          // Settings opens as a modal over the current page.
          if (to === '/settings') onSettingsPane('account')
          else void navigate({ to })
        }}
      />
      <LiveToasts />
      <ProblemReportButton />
      {settingsPane && <SettingsDialog pane={settingsPane} onPane={onSettingsPane} onClose={() => onSettingsPane(undefined)} />}
    </ToastViewport>
  )
}
