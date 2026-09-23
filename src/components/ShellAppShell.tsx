// Copyright (c) Meta Platforms, Inc. and affiliates.

'use client'

import { useState, useMemo, useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'
import { AppShell } from '@astryxdesign/core/AppShell'
import { CommandPalette } from '@astryxdesign/core/CommandPalette'
import { createStaticSource } from '@astryxdesign/core/Typeahead'
// import {ShellTopNav} from './ShellTopNav';
import { ShellSideNav } from './ShellSideNav'

const COMMANDS = [
  { id: 'new-file', label: 'New File' },
  { id: 'open-file', label: 'Open File…' },
  { id: 'save-all', label: 'Save All' },
  { id: 'find-in-files', label: 'Find in Files' },
  { id: 'toggle-terminal', label: 'Toggle Terminal' },
  { id: 'go-to-symbol', label: 'Go to Symbol…' },
  { id: 'appshell', label: 'AppShell.tsx' },
  { id: 'topnav', label: 'TopNav.tsx' },
  { id: 'sidenav', label: 'SideNav.tsx' },
  { id: 'use-theme', label: 'useTheme.ts' },
  { id: 'theme', label: 'theme.ts' },
]

export function ShellAppShell() {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const searchSource = useMemo(() => createStaticSource(COMMANDS), [])

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
        // topNav={<ShellTopNav onOpenPalette={() => setIsPaletteOpen(true)} />}
        sideNav={<ShellSideNav onOpenPalette={() => setIsPaletteOpen(true)} />}
      >
        <Outlet />
      </AppShell>
      <CommandPalette
        isOpen={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
        searchSource={searchSource}
        label="Search files and commands"
        onValueChange={() => setIsPaletteOpen(false)}
      />
    </>
  )
}
