// GET /api/payload/$hash/download — a captured payload's bytes; administrators only.
import { createFileRoute } from '@tanstack/react-router'
import { payloadFile, serveDownload } from '#/data/downloads'

export const Route = createFileRoute('/api/payload/$hash/download')({
  server: { handlers: { GET: ({ request, params }) => serveDownload(request, payloadFile(params.hash)) } },
})
