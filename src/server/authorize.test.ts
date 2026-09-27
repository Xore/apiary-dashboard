// The authorization matrix (#5): every query of the data seam against an
// anonymous caller, a viewer and an admin, enforced by the backend itself.
import { describe, expect, it } from 'vitest'
import { backend, queryNames } from '#/data/backend'
import { asApiError } from '#/data/errors'
import type { SessionUser } from '#/data/types'
import { ADMIN_QUERIES, PUBLIC_QUERIES, authorize } from './authorize'

const viewer: SessionUser = { name: 'Analyst', email: 'analyst@example.test', roles: ['viewer'] }
const admin: SessionUser = { name: 'Operator', email: 'operator@example.test', roles: ['admin'] }

describe('authorization matrix', () => {
  it.each(queryNames().map((name) => [name]))('%s', (name) => {
    const expected = PUBLIC_QUERIES.has(name) ? ['allowed', 'allowed', 'allowed'] : ADMIN_QUERIES.has(name) ? ['sign-in', 'admin-only', 'allowed'] : ['sign-in', 'allowed', 'allowed']
    expect([authorize(name, null), authorize(name, viewer), authorize(name, admin)]).toEqual(expected)
  })

  it('names only queries that exist', () => {
    const names = new Set<string>(queryNames())
    expect([...ADMIN_QUERIES, ...PUBLIC_QUERIES].filter((name) => !names.has(name))).toEqual([])
  })

  it('keeps the canonical admin-only writes admin-only', () => {
    // Canonical's 30 admin-only functions, by the mock's names (see
    // docs/migration/server-functions.md).
    for (const name of ['setIpBlocked', 'purgeDeadLetters', 'setProblemStatus', 'saveConfigSection', 'rollbackConfig', 'runServiceAction', 'acknowledgeAnomalies', 'acknowledgeAllAnomalies', 'setAnomalyDisposition', 'saveReportDefinition', 'deleteReportDefinition', 'generateReport', 'deleteGeneratedReport', 'startAnalysisRun', 'abortGpuJob', 'queuePayloadAction', 'generatePayloadReport', 'provisionCredential', 'rotateCredential', 'linkCredentialToken'])
      expect(ADMIN_QUERIES.has(name), name).toBe(true)
    // …and what canonical leaves to any signed-in operator stays that way.
    for (const name of ['createCanarytoken', 'setAlertsAcknowledged', 'acknowledgeAllAlerts', 'savePreferences', 'submitProblemReport']) expect(ADMIN_QUERIES.has(name), name).toBe(false)
  })
})

describe('the backend enforces it', () => {
  const failure = async (run: () => Promise<unknown>) => {
    try {
      await run()
    } catch (e) {
      return asApiError(e)?.kind
    }
    return undefined
  }

  it('without a session: only the public queries answer', async () => {
    const q = backend('normal', null)
    expect(await failure(() => q.getEvents({}))).toBe('expired')
    expect(await q.getSessionUser()).toBeNull()
    expect(await failure(() => q.getPreferences())).toBeUndefined()
  })

  it('a viewer reads everything and is refused admin writes', async () => {
    const q = backend('normal', viewer)
    expect(await failure(() => q.getEvents({}))).toBeUndefined()
    expect(await failure(() => q.setIpBlocked('198.51.100.1', true))).toBe('forbidden')
    expect(await failure(() => q.acknowledgeAllAnomalies())).toBe('forbidden')
  })

  it('an admin may make them', async () => {
    const q = backend('normal', admin)
    expect(await failure(() => q.setIpBlocked('198.51.100.1', true))).toBeUndefined()
    await q.setIpBlocked('198.51.100.1', false)
    expect(await q.getSessionUser()).toEqual(admin)
  })
})
