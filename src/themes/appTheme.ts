// The Astryx theme for the operator's appearance preferences: a member of the
// neutral theme family per APIARY palette (a whole theme, not only an accent),
// each with a high-contrast twin.
// The family stylesheet holds every member, so switching only changes the
// theme identity on the root; the server renders the chosen one, so the
// first paint is already right.
import type { DefinedTheme } from '@astryxdesign/core/theme'
import {
  neutralAmberHcTheme,
  neutralAmberTheme,
  neutralClaudeHcTheme,
  neutralClaudeTheme,
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
  neutralSageHcTheme,
  neutralSageTheme,
  neutralSlateHcTheme,
  neutralSlateTheme,
} from './neutral/neutral-family'
import type { Palette } from '#/data/types'

const THEMES: Record<Palette, { standard: DefinedTheme; high: DefinedTheme }> = {
  // Claude is the default, as in APIARY: warm charcoal and ivory, copper.
  claude: { standard: neutralClaudeTheme, high: neutralClaudeHcTheme },
  slate: { standard: neutralSlateTheme, high: neutralSlateHcTheme },
  sage: { standard: neutralSageTheme, high: neutralSageHcTheme },
  amber: { standard: neutralAmberTheme, high: neutralAmberHcTheme },
  lavender: { standard: neutralLavenderTheme, high: neutralLavenderHcTheme },
  lime: { standard: neutralLimeTheme, high: neutralLimeHcTheme },
  neon: { standard: neutralNeonTheme, high: neutralNeonHcTheme },
  ocean: { standard: neutralOceanTheme, high: neutralOceanHcTheme },
  rose: { standard: neutralRoseTheme, high: neutralRoseHcTheme },
}

/** The theme for a palette and contrast preference; no palette is the
 * default. */
export function appTheme(palette: Palette | undefined, highContrast = false): DefinedTheme {
  const pair = THEMES[palette ?? 'claude']
  return highContrast ? pair.high : pair.standard
}
