// Sign-in against the mock identity provider: the page's end of it. The
// session itself is created on the server (src/server/signIn.ts) and lives
// only in an HttpOnly cookie. With Keycloak configured the /auth/* server
// handlers run the real flow (src/server/oidc.server.ts) and these refuse.
import { createServerFn } from '@tanstack/react-start'
import type { Role } from '#/server/session'

/** Whether sign-in can start now; the sign-in page says so when not. */
export const getSignInAvailable = createServerFn({ method: 'GET' }).handler(async () => (await import('#/server/signIn')).signInAvailable())

export const signInMock = createServerFn({ method: 'POST' })
  .validator((data: { role: Role }) => data)
  .handler(async ({ data }) => {
    await (await import('#/server/signIn')).signInMock(data.role === 'viewer' ? 'viewer' : 'admin')
  })
