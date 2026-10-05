// GET /api/topology/flow — the fleet topology's flow graph, the one slice of
// /api/v1/topology the browser sees, for a signed-in operator.
//
// The endpoint answers the whole document; this serves its `flow` field,
// which is already the `FlowGraph` the page draws, so it passes through
// untouched (backend-service topology.rs:644 — `TopologyResponse.flow`).
import { createFileRoute } from '@tanstack/react-router'
import { serveDownload } from '#/data/downloads'
import { topologyFlow } from '#/data/mock/charts'
import { ApiError } from '#/data/errors'
import { isLiveBackend, liveTopologyFlow } from '#/data/api'

const plain = (status: number, message: string) => new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } })

export const Route = createFileRoute('/api/topology/flow')({
  server: {
    handlers: {
      GET: ({ request }) =>
        serveDownload(request, async (search, q) => {
          // As on the chart route: a `?mock=` scenario always keeps the mock,
          // and only an unscoped request in a process with a BACKEND_URL
          // reaches the Rust tier.
          if (isLiveBackend() && !search.has('mock')) {
            try {
              const flow = await liveTopologyFlow()
              if (flow === null) return plain(502, 'topology unavailable')
              return Response.json(flow, { headers: { 'cache-control': 'no-store' } })
            } catch (error) {
              // One answer for every refusal, as canonical's topology proxy
              // makes it and as the chart route does above.
              if (error instanceof ApiError) return plain(502, 'topology unavailable')
              throw error
            }
          }
          return Response.json(await topologyFlow(q), { headers: { 'cache-control': 'no-store' } })
        }),
    },
  },
})
