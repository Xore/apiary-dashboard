import { paletteSyntax } from './neutral/neutralVariants'
import { describe, expect, it } from 'vitest'
import { resolveThemeTokens } from '@astryxdesign/core/theme/tokens'
import { ASTRYX_THEMES, appTheme } from './appTheme'
import { APIARY_PALETTES } from './neutral/apiaryPalettes.generated'
import type { ApiaryPalette } from './neutral/apiaryPalettes.generated'

const PALETTES = Object.keys(APIARY_PALETTES) as ApiaryPalette[]

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

// WCAG AA (4.5:1) for the two places a palette's text sits on its own
// translucent fills, in every palette and mode: secondary text on two layers
// of the neutral fill over the chrome (a keyboard hint in a button), and
// accent text on the accent's soft fill (the selected navigation item).
type Rgba = [number, number, number, number]
const rgba = (color: string): Rgba => {
  const fn = color.match(/rgba?\(([^)]+)\)/)
  if (fn) {
    const [r, g, b, a = 1] = fn[1].split(',').map((x) => Number(x.trim()))
    return [r, g, b, a]
  }
  return [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)).concat(1) as Rgba
}
const over = (top: Rgba, bottom: Rgba): Rgba => [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3])).concat(1) as Rgba
const luminance = (c: Rgba) => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2])
const channel = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
const contrast = (a: Rgba, b: Rgba) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('palette contrast', () => {
  it('keeps text on the palette\'s own fills at 4.5:1', () => {
    for (const p of PALETTES) {
      for (const mode of ['light', 'dark'] as const) {
        const tokens = resolveThemeTokens(appTheme(p), { mode })
        const role = APIARY_PALETTES[p][mode]
        const chrome = rgba(tokens['--color-background-body'])
        const fill = rgba(tokens['--color-neutral'])
        expect(contrast(rgba(tokens['--color-text-secondary']), over(fill, over(fill, chrome))), `${p} ${mode} key hint`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(rgba(tokens['--color-text-accent']), over(rgba(role['accent-soft']), chrome)), `${p} ${mode} selected item`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

describe('palette syntax themes', () => {
  it('keeps every code token at 4.5:1 on its code background', () => {
    for (const p of PALETTES) {
      const tokens = paletteSyntax(p).__inputTokens as Record<string, [string, string]>
      for (const [side, mode] of [[0, 'light'], [1, 'dark']] as const) {
        const background = rgba(tokens.background[side])
        for (const [token, value] of Object.entries(tokens)) {
          if (token !== 'background') expect(contrast(rgba(value[side]), background), `${p} ${mode} ${token}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })
})

describe('Astryx themes', () => {
  it('are selectable as themes of their own, without a high-contrast twin', () => {
    for (const name of Object.keys(ASTRYX_THEMES) as Array<keyof typeof ASTRYX_THEMES>) {
      expect(appTheme(name)).toBe(ASTRYX_THEMES[name])
      expect(appTheme(name, true)).toBe(ASTRYX_THEMES[name])
    }
    expect(appTheme('gothic').name).toBe('gothic')
  })
})
