import { afterEach, describe, expect, it, vi } from 'vitest'
import { beginReauth, resetReauth, sessionAwareFetch } from './reauth'

const here = (pathname: string) => ({ pathname, search: '?q=1', hash: '#h', assign: vi.fn() })

describe('sign-in again', () => {
  afterEach(() => {
    resetReauth()
    vi.unstubAllGlobals()
  })

  it('starts one sign-in for concurrent 401s, back to the same page', () => {
    const page = here('/events')
    expect([beginReauth(page), beginReauth(page), beginReauth(page)]).toEqual([true, false, false])
    expect(page.assign).toHaveBeenCalledOnce()
    expect(page.assign).toHaveBeenCalledWith('/auth/login?return_to=%2Fevents%3Fq%3D1%23h')
  })

  it('never loops on a sign-in page', () => {
    const page = here('/auth/callback')
    expect(beginReauth(page)).toBe(false)
    expect(page.assign).not.toHaveBeenCalled()
  })

  it('sends the CSRF header on every server function call', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', fetch)
    await sessionAwareFetch('/_serverFn/x', { method: 'POST', headers: { 'content-type': 'application/json' } })
    const headers = new Headers(fetch.mock.calls[0][1]?.headers)
    expect(headers.get('x-csrf-token')).toBe('1')
    expect(headers.get('content-type')).toBe('application/json')
  })
})
