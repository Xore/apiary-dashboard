// Helpers for the neutral theme family's members (one file per member in
// ./variants, because the family build takes one theme per file): a theme
// per APIARY palette, and a high-contrast twin of each.
//
// A palette is a whole theme, as in APIARY: the ground and the chrome around
// it, the surface ramp, borders, the text ramp, the accent family and the
// status tones all come from it (apiaryPalettes.generated.ts, imported from
// APIARY's contrast-checked theme.css). Typography, shape, motion, chart
// series and component anatomy stay the neutral ones. `bun run theme:build`
// compiles neutralTheme and every member into neutral-family.css / .js / .d.ts.
import {defineSyntaxTheme, defineTheme} from '@astryxdesign/core/theme';
import type {DefinedTheme, TokenValue} from '@astryxdesign/core/theme';
import {APIARY_PALETTES} from './apiaryPalettes.generated';
import type {ApiaryPalette} from './apiaryPalettes.generated';
import {neutralTheme} from './neutralTheme';

type Tokens = Record<string, TokenValue>;
type Role = keyof (typeof APIARY_PALETTES)['claude']['light'];

/** One APIARY role as an Astryx light/dark pair. */
const role = (palette: ApiaryPalette, name: Role): TokenValue => [APIARY_PALETTES[palette].light[name], APIARY_PALETTES[palette].dark[name]];

/** Between two roles, for the steps APIARY has no token of its own for. */
const mix = (palette: ApiaryPalette, a: Role, b: Role, share: number): TokenValue => {
  const {light, dark} = APIARY_PALETTES[palette];
  return [`color-mix(in oklab, ${light[a]} ${share}%, ${light[b]})`, `color-mix(in oklab, ${dark[a]} ${share}%, ${dark[b]})`];
};

/** A palette's ink as a translucent fill, for the neutral controls that stack
 * on the chrome (a keyboard hint inside a button). Kept light enough that
 * secondary text on two layers of it still reads at 4.5:1 in every palette. */
const inkFill = (palette: ApiaryPalette): TokenValue => {
  const rgba = (hex: string, alpha: number) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')}, ${alpha})`;
  const {light, dark} = APIARY_PALETTES[palette];
  return [rgba(light['text-000'], 0.04), rgba(dark['text-000'], 0.06)];
};

/** Every colour role a palette owns, mapped onto Astryx's tokens. The app's
 * chrome (sidebar, top bar) is the body; the page it frames is the surface. */
function paletteTokens(p: ApiaryPalette): Tokens {
  return {
    '--color-background-body': role(p, 'bg-sidebar'),
    '--color-background-surface': role(p, 'bg-000'),
    '--color-background-card': role(p, 'bg-100'),
    '--color-background-popover': role(p, 'bg-raised'),
    '--color-background-muted': role(p, 'bg-200'),
    '--color-neutral': inkFill(p),
    '--color-skeleton': role(p, 'bg-300'),

    '--color-border': role(p, 'border-200'),
    '--color-border-emphasized': mix(p, 'text-300', 'bg-400', 50),

    '--color-text-primary': role(p, 'text-000'),
    '--color-text-secondary': role(p, 'text-100'),
    '--color-text-disabled': role(p, 'text-300'),
    '--color-icon-primary': role(p, 'text-000'),
    '--color-icon-secondary': role(p, 'text-200'),
    '--color-icon-disabled': role(p, 'text-300'),

    '--color-accent': role(p, 'accent'),
    '--color-accent-muted': role(p, 'accent-soft'),
    // Accent-coloured text sits on the accent's soft fill (the selected
    // navigation item) as often as on a plain surface: APIARY's
    // text-on-soft reads on both.
    '--color-text-accent': role(p, 'accent-text-on-soft'),
    '--color-icon-accent': role(p, 'accent'),
    '--color-on-accent': role(p, 'text-on-accent'),
    // Single-series chart ink: the palette's accent, so a chart drawn in one
    // hue belongs to its theme. Themes without it fall back to categorical blue.
    '--color-data-ink': role(p, 'accent'),

    // APIARY's light success green carries white text at 4.3:1; a touch of
    // the palette's ink lifts it past 4.5:1 without changing its hue.
    '--color-success': [`color-mix(in oklab, ${APIARY_PALETTES[p].light.success} 88%, ${APIARY_PALETTES[p].light['text-000']})`, APIARY_PALETTES[p].dark.success],
    '--color-error': role(p, 'danger'),
    '--color-warning': role(p, 'warning'),
    '--color-success-muted': role(p, 'success-soft'),
    '--color-error-muted': role(p, 'danger-soft'),
    '--color-warning-muted': role(p, 'warning-soft'),
    '--color-on-success': role(p, 'text-on-status'),
    '--color-on-error': role(p, 'text-on-status'),
    '--color-on-warning': role(p, 'text-on-status'),

    '--color-overlay': role(p, 'overlay-bg'),
    '--color-shadow': role(p, 'shadow-raised-far'),
  };
}

/** High contrast on top of a palette: secondary text and icons move most of
 * the way to primary, hairlines become solid rules, and the accent takes its
 * deeper (light) or brighter (dark) step. */
function highContrastTokens(p: ApiaryPalette): Tokens {
  const {light, dark} = APIARY_PALETTES[p];
  return {
    '--color-text-secondary': mix(p, 'text-000', 'text-100', 70),
    '--color-text-disabled': mix(p, 'text-100', 'text-300', 60),
    '--color-icon-secondary': mix(p, 'text-000', 'text-200', 70),
    '--color-border': mix(p, 'text-100', 'text-300', 40),
    '--color-border-emphasized': role(p, 'text-100'),
    '--color-accent': [light['accent-pressed'], dark['accent-hover']],
    '--color-icon-accent': [light['accent-pressed'], dark['accent-hover']],
    '--color-data-ink': [light['accent-pressed'], dark['accent-hover']],
    '--color-text-accent': role(p, 'text-link-hover'),
  };
}

/** Code colours from the palette's own roles, so a code block belongs to its
 * theme: the accent for keywords, the status tones for literals, the text
 * ramp for the rest, on the palette's muted surface. APIARY tunes its
 * text-on-soft tones to read on tinted grounds, which keeps every token at
 * 4.5:1 or better on that surface (appTheme.test.ts checks it). */
export function paletteSyntax(p: ApiaryPalette) {
  const {light, dark} = APIARY_PALETTES[p];
  const tone = (name: Role): [string, string] => [light[name], dark[name]];
  return defineSyntaxTheme({
    name: `apiary-${p}`,
    tokens: {
      keyword: tone('accent-text-on-soft'),
      string: tone('success-text-on-soft'),
      comment: tone('text-100'),
      number: tone('warning-text-on-soft'),
      function: tone('info-text-on-soft'),
      type: tone('accent-text-on-soft'),
      variable: tone('text-000'),
      operator: tone('text-100'),
      constant: tone('warning-text-on-soft'),
      tag: tone('danger-text-on-soft'),
      attribute: tone('warning-text-on-soft'),
      property: tone('info-text-on-soft'),
      punctuation: tone('text-100'),
      background: tone('bg-200'),
    },
  });
}

/** Where the app shows "you are here": the selected side-nav and top-nav
 * items take the accent's tint, as APIARY's navigation does. */
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

export function paletteTheme(palette: ApiaryPalette): DefinedTheme {
  return defineTheme({
    name: `neutral-${palette}`,
    extends: neutralTheme,
    syntax: paletteSyntax(palette),
    tokens: paletteTokens(palette),
    components: accentSelection,
  });
}

export function paletteHighContrastTheme(palette: ApiaryPalette): DefinedTheme {
  return defineTheme({
    name: `neutral-${palette}-hc`,
    extends: neutralTheme,
    syntax: paletteSyntax(palette),
    tokens: {...paletteTokens(palette), ...highContrastTokens(palette)},
    components: accentSelection,
  });
}
