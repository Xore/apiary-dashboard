import { useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { AppShell } from '@astryxdesign/core/AppShell'
import { CommandPalette } from '@astryxdesign/core/CommandPalette'
import { createStaticSource } from '@astryxdesign/core/Typeahead'
import type { SessionUser } from '#/data/types'
import { NAV_SECTIONS } from '#/lib/nav'
import { SettingsDialog } from './SettingsDialog'
import type { PaneId } from './SettingsDialog'
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
  /** The open settings pane, if the settings modal is showing. */
  settingsPane?: PaneId
  onSettingsPane: (pane: PaneId | undefined) => void
}

export function ShellAppShell({ user, settingsPane, onSettingsPane }: ShellProps) {
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
    <>
      <AppShell
        contentPadding={0}
        topNav={<ShellTopNav onOpenPalette={() => setIsPaletteOpen(true)} />}
        sideNav={<ShellSideNav user={user} onOpenSettings={() => onSettingsPane('account')} />}
      >
        <Outlet />
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
      {settingsPane && <SettingsDialog pane={settingsPane} onPane={onSettingsPane} onClose={() => onSettingsPane(undefined)} />}
    </>
  )
}
