// Links to the files the dashboard serves (/api/...). They carry the mock
// scenario, so a download fails, empties or refuses the way the page does.
import { mockScenario } from '#/data/scenario'

export function apiHref(path: string, params: Record<string, string | number | undefined> = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') search.set(key, String(value))
  const scenario = mockScenario()
  if (scenario !== 'normal') search.set('mock', scenario)
  const query = search.toString()
  return query ? `${path}?${query}` : path
}
