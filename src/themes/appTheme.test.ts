import { describe, expect, it } from 'vitest'
import { resolveThemeTokens } from '@astryxdesign/core/theme/tokens'
import { appTheme } from './appTheme'
import { neutralTheme } from './neutral/neutral-family'
import type { Palette } from '#/data/types'

const PALETTES: Palette[] = ['claude', 'amber', 'lavender', 'lime', 'neon', 'ocean', 'rose', 'slate']

describe('appTheme', () => {
  it('keeps the neutral theme for the default palette', () => {
    expect(appTheme('claude')).toBe(neutralTheme)
    expect(appTheme(undefined)).toBe(neutralTheme)
  })

  it('gives every palette and contrast its own family member', () => {
    const names = PALETTES.flatMap((p) => [appTheme(p).name, appTheme(p, true).name])
    expect(new Set(names).size).toBe(PALETTES.length * 2)
    for (const p of PALETTES) expect(appTheme(p, true).name).toMatch(/-hc$/)
  })

  it('changes the accent with the palette, in both modes', () => {
    for (const mode of ['light', 'dark'] as const) {
      const accents = PALETTES.map((p) => resolveThemeTokens(appTheme(p), { mode })['--color-accent'])
      expect(new Set(accents).size).toBe(PALETTES.length)
    }
  })

  it('strengthens secondary text and borders in high contrast', () => {
    for (const p of PALETTES) {
      for (const mode of ['light', 'dark'] as const) {
        const standard = resolveThemeTokens(appTheme(p), { mode })
        const high = resolveThemeTokens(appTheme(p, true), { mode })
        expect(high['--color-text-secondary']).not.toBe(standard['--color-text-secondary'])
        expect(high['--color-border']).not.toBe(standard['--color-border'])
      }
    }
  })
})
