// Same-origin rule: a request that can change state must come from a page
// of this dashboard (CSRF). Safe methods pass; the rest need an Origin or
// Referer on this host. /auth/logout checks the header even on GET, since
// signing out changes state.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export const crossOriginResponse = () => Response.json({ ok: false, error: 'Cross-origin request rejected.' }, { status: 403 })

export function hasSameOriginHeader(request: Request): boolean {
  const header = request.headers.get('origin') ?? request.headers.get('referer')
  if (!header) return false
  try {
    const external = process.env.EXTERNAL_URL
    const from = new URL(header)
    if (external && from.origin === new URL(external).origin) return true
    return from.host === new URL(request.url).host
  } catch {
    return false
  }
}

export const isSameOriginRequest = (request: Request) => SAFE_METHODS.has(request.method) || hasSameOriginHeader(request)
