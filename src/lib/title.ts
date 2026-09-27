// The browser tab's title, as an admin sets its format for everyone
// (Settings → Branding): {page}, {app} and {section} are filled in.
export const TITLE_TOKENS = ['page', 'app', 'section'] as const
export const DEFAULT_TITLE_FORMAT = '{page} — {app}'

export function formatTitle(format: string, values: { page: string; app: string; section: string }): string {
  let chosen = format || DEFAULT_TITLE_FORMAT
  // An empty section (pages outside the sidebar) goes with one of the
  // separators next to it, so none is left dangling.
  if (!values.section) chosen = chosen.replace(/\s*[—–|·:-]\s*\{section\}|\{section\}\s*[—–|·:-]\s*/g, '')
  return chosen.replace(/\{(page|app|section)\}/g, (_, token: keyof typeof values) => values[token]).trim()
}

/** Why a format cannot be saved, or undefined. */
export function titleFormatProblem(format: string): string | undefined {
  if (!format.includes('{page}')) return 'Must contain {page}, so tabs can be told apart.'
  const unknown = [...format.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]).filter((t) => !(TITLE_TOKENS as readonly string[]).includes(t))
  if (unknown.length) return `Unknown placeholder {${unknown[0]}}: use {page}, {app} or {section}.`
  if (format.length > 120) return 'At most 120 characters.'
  return undefined
}
