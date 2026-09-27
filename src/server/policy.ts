// Boot policies: the environment must not open the dashboard by accident.
// Both are checked before the server listens (server.ts) and when the
// server code first loads (dev), so a misconfigured process dies instead of
// serving one open request. The canonical codes and override, unchanged.

/** `SERVICE_TOKEN` unset and this exactly "1" is the only way an instance
 * without the shared secret may boot. */
export const DEV_UNAUTH_OVERRIDE_ENV = 'APIARY_ALLOW_UNAUTH_DEV'
export const SERVICE_TOKEN_GATE_CODE = 'E-SERVICE-TOKEN'
export const OIDC_DISABLED_GATE_CODE = 'E-OIDC-DISABLED'

type Env = Record<string, string | undefined>
type Policy<T extends string> = { kind: T } | { kind: 'refuse'; message: string }

export function serviceTokenPolicy(env: Env = process.env): Policy<'token' | 'dev-override'> {
  if (env.SERVICE_TOKEN) return { kind: 'token' }
  if (env[DEV_UNAUTH_OVERRIDE_ENV] === '1') return { kind: 'dev-override' }
  return {
    kind: 'refuse',
    message: `[${SERVICE_TOKEN_GATE_CODE}] refusing to start: SERVICE_TOKEN is unset or empty, which would leave the backend tier open to unauthenticated requests. Set SERVICE_TOKEN to the secret the backend also carries, or for local development only set ${DEV_UNAUTH_OVERRIDE_ENV}=1 explicitly.`,
  }
}

/** OIDC_DISABLED=1 lets every request in as a fixture admin: only in
 * development, said out loud. */
export function oidcDisabledPolicy(env: Env = process.env): Policy<'enforced' | 'dev-override'> {
  if (env.OIDC_DISABLED !== '1') return { kind: 'enforced' }
  if (env.NODE_ENV === 'development' || env[DEV_UNAUTH_OVERRIDE_ENV] === '1') return { kind: 'dev-override' }
  return {
    kind: 'refuse',
    message: `[${OIDC_DISABLED_GATE_CODE}] refusing to start: OIDC_DISABLED=1 is set outside development (NODE_ENV=${env.NODE_ENV ?? 'unset'}), which would let every request in as a fixture admin with no session. Unset OIDC_DISABLED, or set NODE_ENV=development or ${DEV_UNAUTH_OVERRIDE_ENV}=1 to confirm this is a local instance.`,
  }
}

/** Throws the first refusal; silent when the environment is sound. */
export function assertBootPolicies(env: Env = process.env): void {
  for (const policy of [serviceTokenPolicy(env), oidcDisabledPolicy(env)]) {
    if (policy.kind === 'refuse') throw new Error(policy.message)
  }
}

export const oidcDisabled = (env: Env = process.env) => env.OIDC_DISABLED === '1'
