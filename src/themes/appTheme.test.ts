import { describe, expect, it } from 'vitest'
import { resolveThemeTokens } from '@astryxdesign/core/theme/tokens'
import { appTheme } from './appTheme'
import { APIARY_PALETTES } from './neutral/apiaryPalettes.generated'
import type { Palette } from '#/data/types'

const PALETTES = Object.keys(APIARY_PALETTES) as Palette[]

describe('appTheme', () => {
  it('defaults to Claude, as APIARY does', () => {
    expect(appTheme(undefined)).toBe(appTheme('claude'))
    expect(PALETTES).toEqual(['claude', 'slate', 'sage', 'lavender', 'lime', 'amber', 'ocean', 'rose', 'neon'])
  })

  it('takes a whole theme from the palette, not only its accent', () => {
    for (const mode of ['light', 'dark'] as const) {
      for (const token of ['--color-background-body', '--color-background-surface', '--color-text-primary', '--color-accent']) {
        const values = PALETTES.map((p) => resolveThemeTokens(appTheme(p), { mode })[token])
        expect(new Set(values).size, `${token} in ${mode}`).toBe(PALETTES.length)
      }
    }
  })

  it('uses APIARY\'s own values for each palette', () => {
    for (const p of PALETTES) {
      for (const mode of ['light', 'dark'] as const) {
        const tokens = resolveThemeTokens(appTheme(p), { mode })
        const apiary = APIARY_PALETTES[p][mode]
        expect(tokens['--color-background-surface']).toBe(apiary['bg-000'])
        expect(tokens['--color-background-card']).toBe(apiary['bg-100'])
        expect(tokens['--color-text-primary']).toBe(apiary['text-000'])
        expect(tokens['--color-accent']).toBe(apiary.accent)
      }
    }
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
