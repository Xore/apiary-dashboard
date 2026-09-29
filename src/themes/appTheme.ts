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
  neutralTheme,
} from './neutral/neutral-family'
import type { AstryxTheme, Palette } from '#/data/types'
import { butterTheme } from './astryx/butter/butter'
import { chocolateTheme } from './astryx/chocolate/chocolate'
import { gothicTheme } from './astryx/gothic/gothic'
import { matchaTheme } from './astryx/matcha/matcha'
import { stoneTheme } from './astryx/stone/stone'
import { y2kTheme } from './astryx/y2k/y2k'

/** Astryx's own themes, as `astryx theme add` scaffolds them: their own
 * typography, shape and icons, and no high-contrast twin. */
export const ASTRYX_THEMES: Record<AstryxTheme, DefinedTheme> = {
  neutral: neutralTheme,
  butter: butterTheme,
  chocolate: chocolateTheme,
  gothic: gothicTheme,
  matcha: matchaTheme,
  stone: stoneTheme,
  y2k: y2kTheme,
}

const THEMES: Record<Exclude<Palette, AstryxTheme>, { standard: DefinedTheme; high: DefinedTheme }> = {
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
  if (palette && palette in ASTRYX_THEMES) return ASTRYX_THEMES[palette as AstryxTheme]
  const pair = THEMES[(palette ?? 'claude') as Exclude<Palette, AstryxTheme>]
  return highContrast ? pair.high : pair.standard
}
