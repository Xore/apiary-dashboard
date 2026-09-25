// GET /api/artifact/$kind/$key/$filename — one file a Ghidra or sandbox run left behind.
import { createFileRoute } from '@tanstack/react-router'
import { artifactFile, serveDownload } from '#/data/downloads'

export const Route = createFileRoute('/api/artifact/$kind/$key/$filename')({
  server: { handlers: { GET: ({ request, params }) => serveDownload(request, artifactFile(params.kind, params.key, params.filename)) } },
})
