// The browser end of the live event stream: an EventSource on /api/live in
// the page's mock scenario. Browsers give up on an answer that is not 200 (a
// backend outage), so a failed stream is reopened after a pause; a change of
// scenario reopens it at once. Source-health changes arrive as `health`
// events and are passed on to the page as HEALTH_CHANGED.
import { HEALTH_CHANGED } from './incidents'
import { pageScenario } from './serverFn'
import type { HoneypotEvent } from './types'

export type StreamCallbacks = { onEvent: (event: HoneypotEvent) => void; onHealth: (healthy: boolean) => void }

const RETRY_MS = 5000

/** Opens the stream; returns the function that closes it. */
export function openLiveStream({ onEvent, onHealth }: StreamCallbacks): () => void {
  // Without the API (a test DOM) there is no stream to open.
  if (typeof EventSource === 'undefined') return () => {}
  let source: EventSource | undefined
  let scenario = pageScenario()
  let retry: ReturnType<typeof setTimeout> | undefined
  let closed = false

  const open = () => {
    source?.close()
    scenario = pageScenario()
    source = new EventSource(scenario === 'normal' ? '/api/live' : `/api/live?mock=${scenario}`)
    source.onopen = () => onHealth(true)
    source.onmessage = (message: MessageEvent<string>) => onEvent(JSON.parse(message.data) as HoneypotEvent)
    source.addEventListener('health', () => window.dispatchEvent(new Event(HEALTH_CHANGED)))
    source.onerror = () => {
      onHealth(false)
      // Closed for good (not 200): reopen later ourselves.
      if (source?.readyState === EventSource.CLOSED && !closed) {
        clearTimeout(retry)
        retry = setTimeout(open, RETRY_MS)
      }
    }
  }
  open()
  // A different scenario is a different backend: reconnect to it.
  const watch = setInterval(() => {
    if (pageScenario() !== scenario) open()
  }, 1000)

  return () => {
    closed = true
    clearInterval(watch)
    clearTimeout(retry)
    source?.close()
  }
}
