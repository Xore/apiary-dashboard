// GET /healthz — the infrastructure probe (Traefik's health check, Docker's
// healthcheck). Unauthenticated and always 200 once the process answers:
// the dashboard reads the backend per request, so there is no warm-up to
// wait for.
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/healthz')({
  server: {
    handlers: {
      GET: () => new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } }),
    },
  },
})
