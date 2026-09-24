import { useState } from 'react'
import { describeError } from './actionError'

/** Runs a write and keeps why it failed, so the page can say so instead of
 * leaving an unhandled rejection behind a button that did nothing. */
export function useGuardedAction() {
  const [error, setError] = useState<string>()
  const guard = async <T,>(write: () => Promise<T>): Promise<T | undefined> => {
    setError(undefined)
    try {
      return await write()
    } catch (e) {
      setError(describeError(e))
      return undefined
    }
  }
  return { error, guard, clearError: () => setError(undefined) }
}
