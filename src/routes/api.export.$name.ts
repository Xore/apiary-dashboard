// GET /api/export/$name — a full-scope export, not just the rows on screen (CSV or JSON), capped at the configured export limit.
import { createFileRoute } from '@tanstack/react-router'
import { exportFile, serveDownload } from '#/data/downloads'

export const Route = createFileRoute('/api/export/$name')({
  server: { handlers: { GET: ({ request, params }) => serveDownload(request, exportFile(params.name)) } },
})
