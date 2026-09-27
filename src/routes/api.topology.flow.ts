// GET /api/topology/flow — the fleet topology's flow graph, the one slice of
// /api/v1/topology the browser sees, for a signed-in operator. Served by the
// mock backend in the link's scenario.
import { createFileRoute } from '@tanstack/react-router'
import { serveDownload } from '#/data/downloads'
import { topologyFlow } from '#/data/mock/charts'

export const Route = createFileRoute('/api/topology/flow')({
  server: {
    handlers: {
      GET: ({ request }) => serveDownload(request, async (_search, q) => Response.json(await topologyFlow(q), { headers: { 'cache-control': 'no-store' } })),
    },
  },
})
