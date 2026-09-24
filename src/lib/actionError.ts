// One sentence for why an action failed, by failure kind, so every button
// that writes says the same thing the same way.
import { asApiError } from '#/data/errors'

export function describeError(error: unknown): string {
  const api = asApiError(error)
  switch (api?.kind) {
    case 'forbidden':
      return 'Admin role required.'
    case 'expired':
      return 'Your session expired. Sign in again, then retry.'
    case 'overloaded':
      return `The backend is busy. Try again${api.retryAfter ? ` in ${api.retryAfter} s` : ' shortly'}.`
    case 'unavailable':
      return 'The backend did not answer. Nothing changed; try again.'
    default:
      return error instanceof Error ? error.message : 'The action failed.'
  }
}
