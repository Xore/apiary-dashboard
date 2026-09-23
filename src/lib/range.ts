// The app-wide time range (epic #25): one window for every page, kept in the
// URL as ?range= and carried across navigation. 24h is the default and is
// left out of the URL.

export const RANGES = [
  { id: '1h', label: 'Last hour' },
  { id: '6h', label: 'Last 6 hours' },
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
] as const

export type RangeId = (typeof RANGES)[number]['id']
export const DEFAULT_RANGE: RangeId = '24h'

export const isRange = (value: unknown): value is RangeId => RANGES.some((r) => r.id === value)

export function rangeLabel(range: RangeId | undefined): string {
  return RANGES.find((r) => r.id === (range ?? DEFAULT_RANGE))!.label
}
