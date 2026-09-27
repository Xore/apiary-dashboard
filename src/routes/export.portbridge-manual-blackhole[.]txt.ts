// GET /export/portbridge-manual-blackhole.txt — the VPS firewall puller's
// URL (every five minutes; must stay byte-identical across the cutover).
// No session check, as in production: the WireGuard tunnel is the trust
// boundary for this one path.
import { createFileRoute } from '@tanstack/react-router'
import { blackholeExport, serveDownload } from '#/data/downloads'

export const Route = createFileRoute('/export/portbridge-manual-blackhole.txt')({
  server: { handlers: { GET: ({ request }) => serveDownload(request, blackholeExport(), { session: false }) } },
})
