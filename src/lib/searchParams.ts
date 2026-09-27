// Free text from the URL. The router parses search values as JSON, so a
// hand-typed `?q=192` or `?q=198.51` (an IP prefix) arrives as a number;
// it is still text the operator typed.
export function textParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() ? value : undefined
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}
