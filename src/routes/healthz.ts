// GET /healthz — the infrastructure probe (Traefik's health check, Docker's
// healthcheck). Unauthenticated and always 200 once the process answers:
// the dashboard reads the backend per request, so there is no warm-up to
// wait for.
//
// #83: the upstream `GET /healthz` (lib.rs:281) is the same pure liveness
// as its `/livez` alias — `Json(Liveness{live, built, revision})`, no
// Elasticsearch round trip (lib.rs:274) — and is public for the same reason
// (lib.rs:699's `public_router`). This route deliberately does NOT call it:
// the same question about the same process is already answered here, for
// free and without a socket, and proxying would put this tier's probe
// latency on a second container's health for no new signal. Where a real
// dependency check belongs is upstream's `GET /readyz` (lib.rs:301), which
// does reach Elasticsearch and can say no — a different route, a different
// caller, and out of scope for a slice about downloads.
//
// Two answers to one probe name is not a conflict, because neither tier is
// the other's: this one says whether the dashboard is up, /readyz says
// whether the backend can serve. Neither requires a session, and neither
// did before this slice.
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/healthz')({
  server: {
    handlers: {
      GET: () => new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } }),
    },
  },
})
