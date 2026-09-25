// GET /api/raw-report/$kind/$sha — the full machine report behind a CAPE or GitHub analysis.
import { createFileRoute } from '@tanstack/react-router'
import { rawReport, serveDownload } from '#/data/downloads'

export const Route = createFileRoute('/api/raw-report/$kind/$sha')({
  server: { handlers: { GET: ({ request, params }) => serveDownload(request, rawReport(params.kind, params.sha)) } },
})
