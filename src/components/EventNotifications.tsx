// Desktop notifications and a sound for events at or above the operator's
// severity threshold, and for canarytoken fires when asked for. Throttled:
// one notice per interval, a burst folded into "N events". Nothing is shown
// in the page itself; operational problems are the toasts' job.
import { useCallback, useRef } from 'react'
import type { HoneypotEvent, Severity } from '#/data/types'
import { useLiveEvents } from '#/lib/live'
import { usePreferences } from '#/lib/prefs'

const RANK: Record<Severity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 }
const MIN_GAP_MS = 15_000

/** A short two-tone chime, made on the spot (no audio file to ship). */
function chime() {
  try {
    const context = new AudioContext()
    for (const [freq, at] of [
      [880, 0],
      [660, 0.12],
    ] as const) {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.08, context.currentTime + at)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + at + 0.25)
      osc.connect(gain).connect(context.destination)
      osc.start(context.currentTime + at)
      osc.stop(context.currentTime + at + 0.3)
    }
  } catch {
    /* no audio: the notification still shows */
  }
}

export function EventNotifications() {
  const prefs = usePreferences()
  const last = useRef(0)
  const pending = useRef<HoneypotEvent[]>([])

  const onEvent = useCallback(
    (event: HoneypotEvent) => {
      if (!prefs || (!prefs.notifyDesktop && !prefs.notifySound)) return
      const canary = event.sensor === 'canarytokens' && prefs.notifyCanary
      if (!canary && RANK[event.severity] < RANK[prefs.notifySeverity]) return
      pending.current.push(event)
      if (Date.now() - last.current < MIN_GAP_MS) return
      last.current = Date.now()
      const batch = pending.current
      pending.current = []
      const head = batch[0]
      const title = batch.length === 1 ? `${head.severity}: ${head.summary}` : `${batch.length} events at ${prefs.notifySeverity} or above`
      const body = batch.length === 1 ? `${head.sensor} · from ${head.srcIp}` : `Newest: ${head.summary}`
      if (prefs.notifyDesktop && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const note = new Notification(title, { body, tag: 'apiary-events' })
        note.onclick = () => {
          window.focus()
          window.location.assign(batch.length === 1 ? `/events/${head.id}` : '/events?since=1h')
        }
      }
      if (prefs.notifySound) chime()
    },
    [prefs],
  )
  useLiveEvents(onEvent)
  return null
}
