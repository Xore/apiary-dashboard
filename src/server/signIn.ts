// The mock identity provider's accounts, and signing one in: a session in
// the store, its id in the canonical cookie on the response.
import { setResponseHeader } from '@tanstack/react-start/server'
import { sessionCookie, sessions } from './session'
import type { Role, Session } from './session'

const ACCOUNTS: Record<Role, Omit<Session, 'createdAt'>> = {
  admin: { sub: 'mock-operator', username: 'operator', displayName: 'Operator', email: 'operator@example.test', role: 'admin' },
  viewer: { sub: 'mock-analyst', username: 'analyst', displayName: 'Analyst', email: 'analyst@example.test', role: 'viewer' },
}

export async function signInMock(role: Role): Promise<void> {
  const sid = await sessions.create(ACCOUNTS[role])
  setResponseHeader('set-cookie', sessionCookie(sid))
}
