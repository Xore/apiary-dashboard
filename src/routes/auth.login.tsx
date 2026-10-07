// /auth/login: where every sign-in starts. In production it redirects to
// Keycloak straight away, and this page never renders; when Keycloak or the
// session store does not answer, it renders "temporarily unavailable" (503).
// Without OIDC_ISSUER_URL (a local instance) the mock stands in for the
// Keycloak form: pick who to sign in as.
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute } from '@tanstack/react-router'
import { AuthFrame, AuthProblem } from '#/components/auth/AuthFrame'
import { getSignInAvailable } from '#/data/auth'
import { returnAfterSignIn, safeReturnTo } from '#/lib/returnTo'

type LoginSearch = { return_to?: string; signed_out?: boolean; fail?: 'unavailable' }

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    return_to: typeof search.return_to === 'string' ? search.return_to : undefined,
    signed_out: search.signed_out === true || search.signed_out === 1 || search.signed_out === '1' || undefined,
    fail: search.fail === 'unavailable' ? 'unavailable' : undefined,
  }),
  server: {
    handlers: {
      GET: async ({ request, next }) => {
        const [{ mockIdentityProvider }, { recordNamedEvent }] = await Promise.all([import('#/server/policy'), import('#/server/obs')])
        if (mockIdentityProvider() || new URL(request.url).searchParams.has('fail')) return next()
        try {
          const { beginLogin } = await import('#/server/oidc.server')
          return new Response(null, { status: 303, headers: { location: await beginLogin(request) } })
        } catch (error) {
          // Keycloak or Redis did not answer: say so, never a bare 500.
          console.warn('[auth] sign-in could not start:', error instanceof Error ? error.message : error)
          recordNamedEvent('auth_callback_failed', { reason: 'login_unavailable' })
          return new Response(null, { status: 303, headers: { location: '/auth/login?fail=unavailable' } })
        }
      },
    },
  },
  loader: async () => ({ available: await getSignInAvailable() }),
  head: () => ({ meta: [{ title: 'Sign in · APIARY' }] }),
  component: Login,
})

function Login() {
  const { return_to, signed_out, fail } = Route.useSearch()
  const { available } = Route.useLoaderData()
  const returnTo = safeReturnTo(return_to)
  if (fail === 'unavailable' || !available) {
    return <AuthProblem heading="Sign-in is temporarily unavailable" detail="The identity provider or session store did not answer, so this sign-in could not start. Reload to retry; if it persists the Keycloak tier may be degraded." />
  }
  const callback = (role: 'admin' | 'viewer') => `/auth/callback?code=mock&role=${role}&return_to=${encodeURIComponent(returnTo)}`
  return (
    <AuthFrame title="Sign in">
      {signed_out && <Banner status="success" title="You are signed out" description="Your session here and at the identity provider has ended." />}
      <Text color="secondary">Mock sign-in. In production this step is the Keycloak sign-in page, and the dashboard never sees a password.</Text>
      <VStack gap={2}>
        <Button label="Continue as Operator (admin)" variant="primary" href={callback('admin')} width="100%" />
        <Button label="Continue as Analyst (viewer)" variant="secondary" href={callback('viewer')} width="100%" />
      </VStack>
      {returnTo !== '/' && <Text type="supporting" color="secondary">{`Afterwards you go back to ${returnAfterSignIn(returnTo)}.`}</Text>}
    </AuthFrame>
  )
}
