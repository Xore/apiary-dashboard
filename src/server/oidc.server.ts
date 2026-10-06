// Keycloak sign-in: the authorization-code flow with PKCE. The state and the
// verifier wait in Redis, one-time, for the callback; the callback trades
// the code for tokens and creates the session. Roles are the dashboard
// client's own (resource_access.<client>.roles), as in the canonical
// realm. Selected by OIDC_ISSUER_URL (policy.ts); server-only.
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import * as oidc from 'openid-client'
import { safeReturnTo } from '#/lib/returnTo'
import { oidcDisabled } from './policy'
import { redis, sessions } from './session'
import type { RedisLike, Session } from './session'

export { oidcDisabled }

const PENDING_PREFIX = 'bff:oidc:pending:'
const PENDING_TTL_SECONDS = 600

const clientId = () => process.env.OIDC_CLIENT_ID ?? 'apiary-dashboard'

async function clientSecret(): Promise<string> {
  const file = process.env.OIDC_CLIENT_SECRET_FILE
  return file ? (await readFile(file, 'utf8')).trim() : (process.env.OIDC_CLIENT_SECRET ?? '')
}

let configPromise: Promise<oidc.Configuration> | null = null

/** Discovery, once per process. A failure is not cached: Keycloak briefly
 * down at startup must not poison every later sign-in (canonical). */
export function oidcConfig(): Promise<oidc.Configuration> {
  configPromise ??= (async () =>
    oidc.discovery(
      new URL(process.env.OIDC_ISSUER_URL ?? ''),
      clientId(),
      await clientSecret(),
      undefined,
      // Exactly "1": a plain-HTTP issuer, for a local Keycloak only.
      process.env.OIDC_ALLOW_INSECURE === '1' ? { execute: [oidc.allowInsecureRequests] } : {},
    ))().catch((error: unknown) => {
    configPromise = null
    throw error
  })
  return configPromise
}

/** The origin Keycloak redirects back to: the registered public one when a
 * proxy in front changes the Host, else the request's own. */
export const externalURL = (request: Request) => (process.env.EXTERNAL_URL ?? new URL(request.url).origin).replace(/\/$/, '')

const callbackURL = (request: Request) => `${externalURL(request)}/auth/callback`

/** Starts a sign-in: where to send the browser. */
export async function beginLogin(request: Request, store: RedisLike = redis()): Promise<string> {
  const config = await oidcConfig()
  const verifier = oidc.randomPKCECodeVerifier()
  const state = randomBytes(24).toString('base64url')
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get('return_to'))
  await store.set(PENDING_PREFIX + state, JSON.stringify({ verifier, returnTo }), 'EX', PENDING_TTL_SECONDS)
  return oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackURL(request),
    scope: 'openid profile email roles',
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
    state,
  }).href
}

/** Finishes a sign-in: the new session's id and where to go, or null when
 * the state is unknown, used or expired. Throws when Keycloak refuses the
 * code or Redis does not answer. */
export async function completeLogin(request: Request, store: RedisLike = redis()): Promise<{ sid: string; returnTo: string } | null> {
  const url = new URL(request.url)
  const state = url.searchParams.get('state') ?? ''
  const raw = state && (await store.getdel(PENDING_PREFIX + state))
  if (!raw) return null
  const pending = JSON.parse(raw) as { verifier: string; returnTo: string }
  // Rebuilt on the registered origin: a proxy hop may have changed it.
  const callback = new URL(callbackURL(request))
  url.searchParams.forEach((value, key) => callback.searchParams.set(key, value))
  const tokens = await oidc.authorizationCodeGrant(await oidcConfig(), callback, { pkceCodeVerifier: pending.verifier, expectedState: state })
  const claims = tokens.claims()
  if (!claims?.sub) return null
  const username = String(claims.preferred_username ?? claims.sub)
  const access = claims.resource_access as Record<string, { roles?: string[] } | undefined> | undefined
  const session: Omit<Session, 'createdAt'> = {
    sub: claims.sub,
    username,
    displayName: String(claims.name ?? username),
    email: String(claims.email ?? ''),
    role: access?.[clientId()]?.roles?.includes('admin') ? 'admin' : 'viewer',
    idToken: tokens.id_token,
  }
  return { sid: await sessions.create(session), returnTo: pending.returnTo }
}

/** Keycloak's end-session URL, so signing out ends the SSO session too. */
export async function logoutURL(request: Request, idToken: string | undefined): Promise<string> {
  return oidc.buildEndSessionUrl(await oidcConfig(), {
    post_logout_redirect_uri: `${externalURL(request)}/auth/login?signed_out=1`,
    ...(idToken ? { id_token_hint: idToken } : {}),
  }).href
}
