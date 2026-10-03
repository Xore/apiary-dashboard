// Builds design-studio/index.html from specimens.tsx: every variant rendered
// with the real Astryx components and themes, and everything the page needs
// (Astryx CSS, every theme, the self-hosted fonts) inlined, so the file opens
// straight from disk and can be passed around.
//
//   bun run studio
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { Theme } from '@astryxdesign/core/theme'
import { APIARY_PALETTES } from '../src/themes/neutral/apiaryPalettes.generated'
import { ASTRYX_THEMES, appTheme } from '../src/themes/appTheme'
import type { Palette } from '../src/data/types'
import { GROUPS } from './specimens'

const root = resolve(import.meta.dir, '..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const resolvePackage = (spec: string) => Bun.resolveSync(spec, root)

// The stylesheets the app imports (src/styles.css), minus Tailwind, which the
// specimens do not use.
const imports = [...read('src/styles.css').matchAll(/@import "([^"]+)";/g)].map((m) => m[1]).filter((spec) => spec !== 'tailwindcss')
const inlineFonts = (css: string, from: string) =>
  css.replace(/src:\s*url\(([^)]+\.woff2)\)[^;]*;/g, (_, file: string) => {
    const data = readFileSync(join(dirname(from), file.replace(/^\.\//, ''))).toString('base64')
    return `src: url(data:font/woff2;base64,${data}) format('woff2');`
  })
const styles = imports
  .map((spec) => {
    const path = spec.startsWith('./') ? join(root, 'src', spec) : resolvePackage(spec)
    return `/* ${spec} */\n${inlineFonts(readFileSync(path, 'utf8'), path)}`
  })
  .join('\n')

// Every theme Settings offers, and the wrapper the Theme provider renders
// for each in each mode: the toolbar swaps between these.
const palettes = [...(Object.keys(APIARY_PALETTES) as Palette[]), ...(Object.keys(ASTRYX_THEMES) as Palette[])]
const wrapper = (palette: Palette, mode: 'light' | 'dark', highContrast: boolean) => {
  const html = renderToStaticMarkup(
    <Theme theme={appTheme(palette, highContrast)} mode={mode}>
      <i />
    </Theme>,
  )
  const [, className, theme] = /class="([^"]*)" data-astryx-theme="([^"]*)"/.exec(html)!
  return { className, theme }
}
const themes = Object.fromEntries(
  palettes.map((p) => [p, Object.fromEntries((['light', 'dark'] as const).flatMap((mode) => [false, true].map((hc) => [`${mode}${hc ? '-hc' : ''}`, wrapper(p, mode, hc)])))]),
)
const label = (p: string) => (p in ASTRYX_THEMES ? `Astryx ${p === 'y2k' ? 'Y2K' : p[0].toUpperCase() + p.slice(1)}` : p[0].toUpperCase() + p.slice(1))

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const start = themes.claude.light

const nav = GROUPS.map(
  (g) => `<p class="studio-nav-group">${escape(g.title)}</p>` + g.specimens.map((s) => `<a href="#${s.id}">${escape(s.name)}<span>${s.variants.length}</span></a>`).join(''),
).join('')

const sections = GROUPS.map(
  (g) =>
    `<h2 class="studio-group">${escape(g.title)}</h2>` +
    g.specimens
      .map(
        (s) => `<section class="studio-specimen" id="${s.id}">
  <header><h3>${escape(s.name)}</h3><p class="studio-uses">${escape(s.uses)}</p><p class="studio-rule">${escape(s.rule)}</p></header>
  <div class="studio-variants">${s.variants
    .map(
      (v) => `<article class="studio-variant" data-variant="${v.key}">
    <p class="studio-variant-label"><b>${escape(v.key)}</b> ${escape(v.title)}${v.key === 'A' ? ' <em>current</em>' : ''}</p>
    <p class="studio-variant-note">${escape(v.note)}</p>
    <div class="studio-stage">${renderToStaticMarkup(<>{v.render()}</>)}</div>
  </article>`,
    )
    .join('')}</div>
</section>`,
      )
      .join(''),
).join('')

const count = GROUPS.reduce((n, g) => n + g.specimens.length, 0)

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Design studio · APIARY Dashboard</title>
<style>
${styles}
/* The studio's own frame, in theme tokens so it follows every palette. */
html, body { margin: 0; }
/* The Theme wrapper is display: contents, so the frame below paints. */
.studio-frame { min-height: 100dvh; background: var(--color-background-body); color: var(--color-text-primary); font-family: var(--font-family-body); }
.studio-bar { position: sticky; top: 0; z-index: 10; display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-3); padding: var(--spacing-3) var(--spacing-6); background: var(--color-background-body); border-bottom: 1px solid var(--color-border); }
.studio-bar h1 { margin: 0 auto 0 0; font-size: var(--text-heading-3-size); font-weight: 600; }
.studio-bar label { display: inline-flex; align-items: center; gap: var(--spacing-2); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.studio-bar select { font: inherit; color: var(--color-text-primary); background: var(--color-background-surface); border: 1px solid var(--color-border-emphasized); border-radius: var(--radius-element); padding: var(--spacing-1) var(--spacing-2); }
.studio-body { display: grid; grid-template-columns: 220px 1fr; }
.studio-nav { position: sticky; top: 57px; align-self: start; max-height: calc(100dvh - 57px); overflow: auto; padding: var(--spacing-4); }
.studio-nav-group { margin: var(--spacing-4) 0 var(--spacing-1); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.studio-nav a { display: flex; justify-content: space-between; padding: var(--spacing-1) var(--spacing-2); border-radius: var(--radius-element); color: var(--color-text-primary); text-decoration: none; font-size: var(--font-size-base); }
.studio-nav a:hover { background: var(--color-overlay-hover); }
.studio-nav a span { color: var(--color-text-secondary); }
.studio-main { padding: var(--spacing-6); background: var(--color-background-surface); border-top-left-radius: var(--radius-page); min-width: 0; }
.studio-intro { max-width: 72ch; color: var(--color-text-secondary); }
.studio-group { margin: var(--spacing-8) 0 var(--spacing-3); font-size: var(--text-heading-2-size); }
.studio-specimen { padding: var(--spacing-5) 0; border-top: 1px solid var(--color-border); scroll-margin-top: 72px; }
.studio-specimen h3 { margin: 0; font-size: var(--text-heading-3-size); }
.studio-uses { margin: var(--spacing-1) 0; font-family: var(--font-family-code); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.studio-rule { margin: 0 0 var(--spacing-4); max-width: 80ch; }
.studio-variants { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: var(--spacing-4); }
.studio-variant { border: 1px solid var(--color-border); border-radius: var(--radius-container); background: var(--color-background-card); padding: var(--spacing-4); min-width: 0; }
.studio-variant-label { margin: 0; }
.studio-variant-label b { display: inline-grid; place-items: center; width: 22px; height: 22px; margin-right: var(--spacing-1); border-radius: var(--radius-full); background: var(--color-accent); color: var(--color-on-accent); font-size: var(--font-size-sm); }
.studio-variant-label em { font-style: normal; font-size: var(--font-size-sm); color: var(--color-text-accent); }
.studio-variant-note { margin: var(--spacing-1) 0 var(--spacing-4); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.studio-stage { min-width: 0; overflow-x: auto; }
@media (max-width: 800px) { .studio-body { grid-template-columns: 1fr; } .studio-nav { display: none; } .studio-main { border-radius: 0; padding: var(--spacing-4); } }
</style>
</head>
<body>
<div id="studio-root" class="${start.className}" data-astryx-theme="${start.theme}" data-theme="light">
<div class="studio-frame">
  <div class="studio-bar">
    <h1>Design studio</h1>
    <label>Palette <select id="studio-palette">${palettes.map((p) => `<option value="${p}">${label(p)}</option>`).join('')}</select></label>
    <label>Mode <select id="studio-mode"><option value="light">Light</option><option value="dark">Dark</option></select></label>
    <label>Contrast <select id="studio-contrast"><option value="">Standard</option><option value="-hc">High</option></select></label>
  </div>
  <div class="studio-body">
    <nav class="studio-nav" aria-label="Components">${nav}</nav>
    <main class="studio-main">
      <p class="studio-intro">Every Astryx component the dashboard uses (${count} specimens), rendered with the real themes. Variant <b>A</b> is the current decision from DESIGN.md; add B, C… in <code>design-studio/specimens.tsx</code> to compare alternatives, then run <code>bun run studio</code>. Static render: menus, dialogs and inputs are shown, not interactive.</p>
      ${sections}
    </main>
  </div>
</div>
</div>
<script>
const themes = ${JSON.stringify(themes)};
const root = document.getElementById('studio-root');
const pick = (id) => document.getElementById(id);
const saved = (() => { try { return JSON.parse(localStorage.getItem('studio') || '{}'); } catch { return {}; } })();
for (const id of ['studio-palette', 'studio-mode', 'studio-contrast']) if (saved[id] != null) pick(id).value = saved[id];
function apply() {
  const mode = pick('studio-mode').value;
  const t = themes[pick('studio-palette').value][mode + pick('studio-contrast').value];
  root.className = t.className;
  root.dataset.astryxTheme = t.theme;
  root.dataset.theme = mode;
  try { localStorage.setItem('studio', JSON.stringify(Object.fromEntries(['studio-palette', 'studio-mode', 'studio-contrast'].map((id) => [id, pick(id).value])))); } catch {}
}
for (const id of ['studio-palette', 'studio-mode', 'studio-contrast']) pick(id).addEventListener('change', apply);
apply();
</script>
</body>
</html>
`

writeFileSync(join(import.meta.dir, 'index.html'), html)
console.log(`design-studio/index.html: ${count} specimens, ${palettes.length} themes, ${(html.length / 1024 / 1024).toFixed(1)} MB`)
