// The Astryx theme for the operator's appearance preferences: a member of the
// neutral theme family per accent palette, each with a high-contrast twin.
// The family stylesheet holds every member, so switching only changes the
// theme identity on the root; the server renders the chosen one, so the
// first paint is already right.
import type { DefinedTheme } from '@astryxdesign/core/theme'
import {
  neutralAmberHcTheme,
  neutralAmberTheme,
  neutralHcTheme,
  neutralLavenderHcTheme,
  neutralLavenderTheme,
  neutralLimeHcTheme,
  neutralLimeTheme,
  neutralNeonHcTheme,
  neutralNeonTheme,
  neutralOceanHcTheme,
  neutralOceanTheme,
  neutralRoseHcTheme,
  neutralRoseTheme,
  neutralSlateHcTheme,
  neutralSlateTheme,
  neutralTheme,
} from './neutral/neutral-family'
import type { Palette } from '#/data/types'

const THEMES: Record<Palette, { standard: DefinedTheme; high: DefinedTheme }> = {
  // Claude is the default: neutral's own black-and-white accent.
  claude: { standard: neutralTheme, high: neutralHcTheme },
  amber: { standard: neutralAmberTheme, high: neutralAmberHcTheme },
  lavender: { standard: neutralLavenderTheme, high: neutralLavenderHcTheme },
  lime: { standard: neutralLimeTheme, high: neutralLimeHcTheme },
  neon: { standard: neutralNeonTheme, high: neutralNeonHcTheme },
  ocean: { standard: neutralOceanTheme, high: neutralOceanHcTheme },
  rose: { standard: neutralRoseTheme, high: neutralRoseHcTheme },
  slate: { standard: neutralSlateTheme, high: neutralSlateHcTheme },
}

/** The theme for a palette and contrast preference; no palette is the
 * default. */
export function appTheme(palette: Palette | undefined, highContrast = false): DefinedTheme {
  const pair = THEMES[palette ?? 'claude']
  return highContrast ? pair.high : pair.standard
}
