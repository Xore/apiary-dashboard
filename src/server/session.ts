// Sessions: an opaque id in an HttpOnly cookie, the identity behind it in a
// store. Production keeps the store in Redis (#5); until then it is kept in
// this process's memory behind the same interface, so the sign-in flow,
// the navigation guard and every role check run for real. Server-only.
import { randomBytes } from 'node:crypto'
import { Unavailable, faulty } from './faults'
import { DEV_HTTP_COOKIE_ENV } from './policy'

export type Role = 'admin' | 'viewer'

export type Session = {
  sub: string
  username: string
  displayName: string
  email: string
  role: Role
  createdAt: number
}

/** What production's Redis store and this in-memory one both do. */
export interface SessionStore {
  create: (data: Omit<Session, 'createdAt'>) => Promise<string>
  get: (sid: string | undefined) => Promise<Session | null>
  destroy: (sid: string | undefined) => Promise<void>
}

export const SESSION_TTL_SECONDS = 12 * 60 * 60
/** The canonical cookie: `__Host-` pins it to this origin, path `/`, Secure. */
export const SESSION_COOKIE = '__Host-apiary_bff'

export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, { session: Session; expires: number }>()
  constructor(private readonly now: () => number = Date.now) {}

  create(data: Omit<Session, 'createdAt'>): Promise<string> {
    if (faulty('session-store')) return Promise.reject(new Unavailable('session-store'))
    const sid = randomBytes(32).toString('base64url')
    this.sessions.set(sid, { session: { ...data, createdAt: this.now() }, expires: this.now() + SESSION_TTL_SECONDS * 1000 })
    return Promise.resolve(sid)
  }

  get(sid: string | undefined): Promise<Session | null> {
    if (faulty('session-store')) return Promise.reject(new Unavailable('session-store'))
    if (!sid || sid.length > 128) return Promise.resolve(null)
    const entry = this.sessions.get(sid)
    if (!entry) return Promise.resolve(null)
    if (entry.expires <= this.now()) {
      this.sessions.delete(sid)
      return Promise.resolve(null)
    }
    return Promise.resolve(entry.session)
  }

  destroy(sid: string | undefined): Promise<void> {
    if (faulty('session-store')) return Promise.reject(new Unavailable('session-store'))
    if (sid) this.sessions.delete(sid)
    return Promise.resolve()
  }
}

/** The process's store. Swapped for the Redis one with the real sign-in.
 * Kept on the process, not the module: in development a code reload
 * re-evaluates this module, and a fresh store would sign everyone out. */
const holder = globalThis as typeof globalThis & { __apiarySessions?: SessionStore }
export const sessions: SessionStore = (holder.__apiarySessions ??= new MemorySessionStore())

/** Development over plain HTTP from another machine: browsers refuse a
 * Secure (and so a `__Host-`) cookie there, and sign-in would loop. With
 * APIARY_DEV_HTTP_COOKIE=1 (development only, see policy.ts) the session
 * rides in this cookie instead: same HttpOnly and SameSite, not Secure. */
export const DEV_SESSION_COOKIE = 'apiary_bff_dev'

const devHttp = () => process.env[DEV_HTTP_COOKIE_ENV] === '1'
const cookieName = () => (devHttp() ? DEV_SESSION_COOKIE : SESSION_COOKIE)
const attributes = (maxAge: number) => `Path=/; HttpOnly; ${devHttp() ? '' : 'Secure; '}SameSite=Lax; Max-Age=${maxAge}`

export const sessionCookie = (sid: string) => `${cookieName()}=${sid}; ${attributes(SESSION_TTL_SECONDS)}`

export const clearSessionCookie = () => `${cookieName()}=; ${attributes(0)}`

export function sidFrom(request: Request): string | undefined {
  const wanted = cookieName()
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === wanted) return rest.join('=')
  }
  return undefined
}
