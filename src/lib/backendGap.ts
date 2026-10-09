// A panel's read that the backend does not serve yet. The page stays up; the
// panel says what is missing, instead of showing an empty list that reads as
// "nothing happened" (#221). Any other failure still throws to the page.
import { asApiError } from '#/data/errors'

export type BackendGap = { gap: string }

export const isBackendGap = <T>(value: T | BackendGap | undefined): value is BackendGap =>
  typeof value === 'object' && value !== null && 'gap' in value

/** The read's answer, or an BackendGap marker when the backend refused it
 * as unavailable. The marker carries the backend-gap detail for the panel. */
export async function backendGapOf<T>(read: Promise<T>): Promise<T | BackendGap> {
  try {
    return await read
  } catch (error) {
    const api = asApiError(error)
    if (api?.kind === 'unavailable') return { gap: api.detail ?? 'The backend did not answer.' }
    throw error
  }
}
