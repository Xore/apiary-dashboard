// How a backend call failed. The pages tell these apart because the
// operator's next step differs: wait and retry, sign in again, ask an
// admin, or accept that the thing is gone.

export type ApiErrorKind = 'unavailable' | 'overloaded' | 'expired' | 'forbidden' | 'locked'

const STATUS: Record<ApiErrorKind, number> = { unavailable: 502, overloaded: 503, expired: 401, forbidden: 403, locked: 423 }

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number
  /** Which call failed, e.g. `getEvents`. */
  readonly endpoint: string
  /** Seconds the backend asked us to wait, when it said (503 Retry-After). */
  readonly retryAfter?: number

  constructor(kind: ApiErrorKind, endpoint: string, options: { retryAfter?: number } = {}) {
    // The message carries everything, so the error survives serialization
    // from a server-side loader, where only name and message make it across.
    super(`${endpoint}: ${STATUS[kind]} ${kind}${options.retryAfter ? ` retry-after=${options.retryAfter}` : ''}`)
    this.name = 'ApiError'
    this.kind = kind
    this.status = STATUS[kind]
    this.endpoint = endpoint
    this.retryAfter = options.retryAfter
  }
}

const MESSAGE = /^(\w+): \d{3} (unavailable|overloaded|expired|forbidden|locked)(?: retry-after=(\d+))?/

/** An ApiError, or one rebuilt from its message: errors thrown in a
 * server-side loader reach the client as plain errors. */
export function asApiError(error: unknown): ApiError | undefined {
  if (error instanceof ApiError) return error
  const message = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : ''
  const match = MESSAGE.exec(message)
  if (!match) return undefined
  return new ApiError(match[2] as ApiErrorKind, match[1], { retryAfter: match[3] ? Number(match[3]) : undefined })
}
