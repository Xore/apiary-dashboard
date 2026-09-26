// Server-side paging for the unbounded lists: the page number lives in
// `?page=` (1-based; the first page is left out of the URL), and the loader
// asks the data seam for just that slice, sized by the operator's rows-per-
// page preference.
import { getPreferences } from '#/data/queries'
import type { PageRequest } from '#/data/types'

export const pageParam = (value: unknown): number | undefined => {
  const n = Number(value)
  return Number.isInteger(n) && n > 1 ? n : undefined
}

export async function pageRequest(page: number | undefined): Promise<Required<PageRequest>> {
  const { rowsPerPage } = await getPreferences()
  return { offset: ((page ?? 1) - 1) * rowsPerPage, limit: rowsPerPage }
}
