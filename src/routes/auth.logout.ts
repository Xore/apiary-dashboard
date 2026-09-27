// GET /auth/logout — ends the session and lands on the signed-out sign-in
// page. A GET that changes state, so it demands a same-origin Origin or
// Referer: a cross-site page loading this URL gets 403 instead of signing
// the operator out (canonical #3153). Production also ends the Keycloak
// session (RP-initiated logout) in #5.
import { createFileRoute } from '@tanstack/react-router'
import { crossOriginResponse, hasSameOriginHeader } from '#/server/origin'
import { clearSessionCookie, sessions, sidFrom } from '#/server/session'

export const Route = createFileRoute('/auth/logout')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasSameOriginHeader(request)) return crossOriginResponse()
        await sessions.destroy(sidFrom(request))
        return new Response(null, { status: 303, headers: { location: '/auth/login?signed_out=1', 'set-cookie': clearSessionCookie() } })
      },
    },
  },
})
