// Links to the files the dashboard serves (/api/...). They carry the mock
// scenario, so a download fails, empties or refuses the way the page does.
import { isScenario, mockScenario } from '#/data/scenario'

/** The scenario the page is in: the URL's own in the browser (module state
 * is only set once the router runs, after hydration), the request's on the
 * server. */
function currentScenario(): string {
  if (typeof window === 'undefined') return mockScenario()
  const fromUrl = new URLSearchParams(window.location.search).get('mock')
  return isScenario(fromUrl) ? fromUrl : 'normal'
}

export function apiHref(path: string, params: Record<string, string | number | undefined> = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') search.set(key, String(value))
  const scenario = currentScenario()
  if (scenario !== 'normal') search.set('mock', scenario)
  const query = search.toString()
  return query ? `${path}?${query}` : path
}
