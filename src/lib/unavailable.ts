// A panel's read that the backend does not serve yet. The page stays up; the
// panel says what is missing, instead of showing an empty list that reads as
// "nothing happened" (#221). Any other failure still throws to the page.
import { asApiError } from '#/data/errors'

export type Unavailable = { unavailable: string }

export const isUnavailable = <T>(value: T | Unavailable | undefined): value is Unavailable =>
  typeof value === 'object' && value !== null && 'unavailable' in value

/** The read's answer, or an Unavailable marker when the backend refused it
 * as unavailable. The marker carries the backend-gap detail for the panel. */
export async function unavailableOf<T>(read: Promise<T>): Promise<T | Unavailable> {
  try {
    return await read
  } catch (error) {
    const api = asApiError(error)
    if (api?.kind === 'unavailable') return { unavailable: api.detail ?? 'The backend did not answer.' }
    throw error
  }
}
