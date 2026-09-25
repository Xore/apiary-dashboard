// GET /api/report/$id/pdf — a generated report's PDF, inline so the browser can show it.
import { createFileRoute } from '@tanstack/react-router'
import { reportPdf, serveDownload } from '#/data/downloads'

export const Route = createFileRoute('/api/report/$id/pdf')({
  server: { handlers: { GET: ({ request, params }) => serveDownload(request, reportPdf(params.id)) } },
})
