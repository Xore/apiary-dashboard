// Where sign-in sends the operator back to. Only a path on this dashboard is
// accepted: anything that could leave it (another origin, a protocol-relative
// `//host`, a backslash that browsers read as a slash) falls back to the
// overview, so a crafted link cannot bounce a fresh session elsewhere.

export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/'
  if (value.startsWith('//') || value.includes('\\') || [...value].some((c) => c.charCodeAt(0) < 0x20)) return '/'
  return value
}

/** The return path as the mock identity signs in: the viewer scenario for
 * the viewer, otherwise none (signing in again leaves "session expired"). */
export function returnAs(returnTo: string, role: 'admin' | 'viewer'): string {
  const url = new URL(safeReturnTo(returnTo), 'http://dashboard.invalid')
  if (role === 'viewer') url.searchParams.set('mock', 'viewer')
  else url.searchParams.delete('mock')
  return `${url.pathname}${url.search}${url.hash}`
}
