// /auth/callback: where the identity provider sends the browser back. A
// completed sign-in goes on to where the operator was; a failed one renders
// what went wrong, in the three ways production tells apart:
// - the provider refused the attempt (`?error=`, 400),
// - the attempt expired or was already used (400),
// - the token exchange failed (502).
// The mock reads which one from `?code=expired|failed`, or fails for real
// under APIARY_MOCK_FAULTS (src/server/faults.ts), and answers 200:
// the router renders only 200, 404 and 500.
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthProblem } from '#/components/auth/AuthFrame'
import { signInMock } from '#/data/auth'
import { returnAfterSignIn } from '#/lib/returnTo'

type CallbackSearch = { code?: string; role?: 'admin' | 'viewer'; return_to?: string; error?: string; error_description?: string }

const text = (value: unknown) => (typeof value === 'string' && value !== '' ? value : undefined)

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    code: text(search.code),
    role: search.role === 'viewer' ? 'viewer' : search.role === 'admin' ? 'admin' : undefined,
    return_to: text(search.return_to),
    error: text(search.error),
    error_description: text(search.error_description),
  }),
  beforeLoad: async ({ search }) => {
    if (search.error || !search.code || search.code === 'expired' || search.code === 'failed') return
    // The mock provider's answer: a session for the chosen account. When
    // the exchange or the session write fails, the page says so.
    try {
      await signInMock({ data: { role: search.role ?? 'admin' } })
    } catch {
      return { failed: true }
    }
    throw redirect({ href: returnAfterSignIn(search.return_to ?? '/') })
  },
  head: () => ({ meta: [{ title: 'Sign in · APIARY' }] }),
  component: Callback,
})

function Callback() {
  const { code, error } = Route.useSearch()
  const failed = Route.useRouteContext()?.failed
  if (error) {
    return <AuthProblem heading="Sign-in was not completed" detail={`The identity provider refused this sign-in attempt (${error}). This usually means the attempt expired or was already used.`} retryHref="/auth/login" />
  }
  if (code === 'failed' || failed) {
    return <AuthProblem heading="Sign-in could not be completed" detail="The identity provider did not accept the token exchange. If this keeps happening, the Keycloak tier may be degraded." retryHref="/auth/login" />
  }
  return <AuthProblem heading="Login attempt expired" detail="This sign-in took too long or was already completed. Start again to continue." retryHref="/auth/login" />
}
