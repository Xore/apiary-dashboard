// The operator's preferences, as the root loaded them. Components read them
// here; outside a router with the root loader (tests) they fall back to the
// defaults below.
import { useRouterState } from '@tanstack/react-router'
import type { Preferences } from '#/data/types'

export function usePreferences(): Preferences | undefined {
  return useRouterState({ select: (s) => s.matches.find((m) => m.routeId === '__root__')?.loaderData })
}

/** Table density from the density preference. */
export const tableDensity = (prefs: Preferences | undefined) => (prefs?.density === 'comfortable' ? 'balanced' : 'compact')
