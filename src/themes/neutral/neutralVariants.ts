// Helpers for the neutral theme family's members (one file per member in
// ./variants, because the family build takes one theme per file): a theme
// per accent palette, and a high-contrast twin of each. Every member extends
// neutralTheme and only re-points colour tokens, so typography, shape,
// motion and component overrides stay the neutral ones.
//
// Accent hues come from accentPalettes.generated.ts, generated from
// accentPalettes.config.json with `astryx theme palette generate`; the seeds
// are the palette swatches shown in Settings. `bun run theme:build` compiles
// neutralTheme and every member into neutral-family.css / .js / .d.ts.
import {defineTheme} from '@astryxdesign/core/theme';
import type {DefinedTheme, TokenValue} from '@astryxdesign/core/theme';
import {palette as accents} from './accentPalettes.generated';
import {palette as base} from './neutralPalettes.generated';
import {neutralTheme} from './neutralTheme';

type Tokens = Record<string, TokenValue>;
type Accent = keyof typeof accents;
type Stop = keyof (typeof accents)[Accent]['light'];

const {neutral} = base;

/** Accent roles from one palette family. The light scheme takes a deep stop
 * under white text, the dark scheme a light stop under near-black text, so
 * filled buttons and selected items keep >= 4.5:1 in both modes. */
function accentTokens(
  family: Accent,
  stops: {light: Stop; dark: Stop},
): Tokens {
  const {light, dark} = accents[family];
  const accent: TokenValue = [light[stops.light], dark[stops.dark]];
  return {
    '--color-accent': accent,
    '--color-accent-muted': [light[95], dark[20]],
    '--color-text-accent': accent,
    '--color-icon-accent': accent,
    '--color-on-accent': [neutral.light[100], neutral.dark[5]],
  };
}

const standardStops = {light: '45', dark: '70'} as const;
const highContrastStops = {light: '30', dark: '85'} as const;

/** High contrast: secondary text and icons read nearly as primary, hairline
 * borders become solid rules, and emphasized borders go stronger still. */
export const highContrastTokens: Tokens = {
  '--color-text-secondary': [neutral.light[15], neutral.dark[85]],
  '--color-text-disabled': [neutral.light[45], neutral.dark[55]],
  '--color-icon-secondary': [neutral.light[20], neutral.dark[85]],
  '--color-border': [neutral.light[45], neutral.dark[55]],
  '--color-border-emphasized': [neutral.light[20], neutral.dark[80]],
};

/** Where the app shows "you are here": the selected side-nav and top-nav
 * items take the accent's tint, so the palette reads beyond buttons. */
const accentSelection = {
  'side-nav-item': {
    selected: {
      backgroundColor: 'var(--color-accent-muted)',
      color: 'var(--color-text-accent)',
    },
  },
  'top-nav-item': {
    selected: {
      backgroundColor: 'var(--color-accent-muted)',
      color: 'var(--color-text-accent)',
    },
  },
};

export function paletteTheme(family: Accent): DefinedTheme {
  return defineTheme({
    name: `neutral-${family}`,
    extends: neutralTheme,
    tokens: accentTokens(family, standardStops),
    components: accentSelection,
  });
}

export function paletteHighContrastTheme(family: Accent): DefinedTheme {
  return defineTheme({
    name: `neutral-${family}-hc`,
    extends: neutralTheme,
    tokens: {
      ...accentTokens(family, highContrastStops),
      ...highContrastTokens,
    },
    components: accentSelection,
  });
}
