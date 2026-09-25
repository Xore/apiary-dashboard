// GET /api/canarytoken/$id/download — a canarytoken's generated artifact (credentials file, kubeconfig, document).
import { createFileRoute } from '@tanstack/react-router'
import { canarytokenFile, serveDownload } from '#/data/downloads'

export const Route = createFileRoute('/api/canarytoken/$id/download')({
  server: { handlers: { GET: ({ request, params }) => serveDownload(request, canarytokenFile(params.id)) } },
})
