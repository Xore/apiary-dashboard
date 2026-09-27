// GET /api/chart/$name — the Rust tier's chart payloads, passed through
// unchanged for a signed-in operator. Allowlisted: only chart names reach
// the backend (404 otherwise), and a chart the backend cannot answer is 502.
// Served by the mock backend in the link's scenario.
import { createFileRoute } from '@tanstack/react-router'
import { isChartName } from '#/data/contracts/charts'
import { serveDownload } from '#/data/downloads'
import { chartPayload } from '#/data/mock/charts'

const plain = (status: number, message: string) => new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } })

export const Route = createFileRoute('/api/chart/$name')({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        serveDownload(request, async (search, q) => {
          if (!isChartName(params.name)) return plain(404, 'unknown chart')
          const data = await chartPayload(params.name, q, search)
          if (data === null) return plain(502, 'chart unavailable')
          return Response.json(data, { headers: { 'cache-control': 'no-store' } })
        }),
    },
  },
})
