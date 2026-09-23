// Formatters pinned to one locale and UTC so server and client render the same
// text (no hydration mismatch from the viewer's timezone).

const numberFormat = new Intl.NumberFormat('en-US')
const compactFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export const formatNumber = (value: number) => numberFormat.format(value)
export const formatCompact = (value: number) => compactFormat.format(value)
export const formatTime = (iso: string) => `${timeFormat.format(new Date(iso))} UTC`
export const formatDateTime = (iso: string) => `${dateTimeFormat.format(new Date(iso))} UTC`

/** Signed percentage change, e.g. "+12.4%". */
export function formatChange(value: number, previous: number): string {
  if (previous === 0) return value === 0 ? '0%' : 'new'
  const pct = ((value - previous) / previous) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}
