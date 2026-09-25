// GET /api/recording/$shasum/$format — a session recording as asciicast (`cast`) or the raw TTY log (`raw`).
import { createFileRoute } from '@tanstack/react-router'
import { recordingFile, serveDownload } from '#/data/downloads'

export const Route = createFileRoute('/api/recording/$shasum/$format')({
  server: { handlers: { GET: ({ request, params }) => serveDownload(request, recordingFile(params.shasum, params.format)) } },
})
