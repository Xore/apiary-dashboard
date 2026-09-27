import { describe, expect, it } from 'vitest'
import { assertBootPolicies, oidcDisabledPolicy, serviceTokenPolicy } from './policy'

describe('boot policies', () => {
  it('needs a service token, or the explicit development override', () => {
    expect(serviceTokenPolicy({ SERVICE_TOKEN: 's3cret' }).kind).toBe('token')
    expect(serviceTokenPolicy({ APIARY_ALLOW_UNAUTH_DEV: '1' }).kind).toBe('dev-override')
    for (const env of [{}, { SERVICE_TOKEN: '' }, { APIARY_ALLOW_UNAUTH_DEV: 'true' }, { APIARY_ALLOW_UNAUTH_DEV: '0' }]) expect(serviceTokenPolicy(env).kind).toBe('refuse')
  })

  it('allows OIDC_DISABLED only in development', () => {
    expect(oidcDisabledPolicy({}).kind).toBe('enforced')
    expect(oidcDisabledPolicy({ OIDC_DISABLED: '1', NODE_ENV: 'development' }).kind).toBe('dev-override')
    expect(oidcDisabledPolicy({ OIDC_DISABLED: '1', APIARY_ALLOW_UNAUTH_DEV: '1' }).kind).toBe('dev-override')
    expect(oidcDisabledPolicy({ OIDC_DISABLED: '1', NODE_ENV: 'production' }).kind).toBe('refuse')
  })

  it('refuses to boot with the canonical codes', () => {
    expect(() => assertBootPolicies({})).toThrow('[E-SERVICE-TOKEN]')
    expect(() => assertBootPolicies({ SERVICE_TOKEN: 's', OIDC_DISABLED: '1', NODE_ENV: 'production' })).toThrow('[E-OIDC-DISABLED]')
    expect(() => assertBootPolicies({ SERVICE_TOKEN: 's' })).not.toThrow()
  })
})
