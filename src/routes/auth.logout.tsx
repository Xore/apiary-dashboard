// /auth/logout: ends the session here and at the identity provider, then
// lands on sign-in. Production goes through Keycloak's end-session page and
// back; the mock goes straight to the signed-out sign-in page.
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/logout')({
  beforeLoad: () => {
    throw redirect({ to: '/auth/login', search: { signed_out: true } })
  },
})
