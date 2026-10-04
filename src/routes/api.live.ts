// GET /api/live — the live event stream, as Server-Sent Events: one `data:`
// line per new event (JSON), an `event: health` when source health changes,
// and a comment every 15 s so proxies keep the connection. Fed by the mock
// backend's generator; the mock scenario the page is in (`?mock=`) shapes it
// like the backend it stands for: an outage answers with its status, an
// empty backend stays open and quiet, a slow one sends sparsely.
import { createFileRoute } from '@tanstack/react-router'
import { listen } from '#/data/mock/liveFeed'
import { isScenario } from '#/data/scenarios'
import { admissionGate, envInt } from '#/server/admission'
import { resolveUser } from '#/server/identity'

const OUTAGE: Record<string, { status: number; headers?: Record<string, string> }> = {
  unavailable: { status: 502 },
  overloaded: { status: 503, headers: { 'retry-after': '30' } },
  expired: { status: 401 },
}

// Concurrent streams this server holds open; past it a new one is shed
// (503, Retry-After: 1) and EventSource reconnects. Canonical's default.
const streams = admissionGate(envInt('LIVE_MAX_STREAMS', 500))

export const Route = createFileRoute('/api/live')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // A direct handler: it checks the session itself.
        if (!(await resolveUser(request))) return new Response('unauthorized', { status: 401 })
        const mock = new URL(request.url).searchParams.get('mock')
        const scenario = isScenario(mock) ? mock : 'normal'
        const outage = OUTAGE[scenario] as (typeof OUTAGE)[string] | undefined
        if (outage) return new Response(`live stream: ${scenario}`, { status: outage.status, headers: outage.headers })
        const release = streams.admit()
        if (release instanceof Response) return release

        const encoder = new TextEncoder()
        let stop = () => {}
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (text: string) => {
              try {
                controller.enqueue(encoder.encode(text))
              } catch {
                stop()
              }
            }
            send('retry: 3000\n: open\n\n')
            let sent = 0
            const unlisten = listen({
              event: (event) => {
                if (scenario === 'empty' || scenario === 'loading') return
                // A slow backend: one event in five.
                if (scenario === 'slow' && sent++ % 5 !== 0) return
                send(`data: ${JSON.stringify(event)}\n\n`)
              },
              health: () => send('event: health\ndata: {}\n\n'),
            })
            const ping = setInterval(() => send(': ping\n\n'), 15_000)
            stop = () => {
              clearInterval(ping)
              unlisten()
              release()
            }
            request.signal.addEventListener('abort', () => {
              stop()
              try {
                controller.close()
              } catch {
                /* already closed */
              }
            })
          },
          cancel() {
            stop()
          },
        })
        return new Response(body, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' } })
      },
    },
  },
})
