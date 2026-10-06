import { describe, expect, it } from 'vitest'
import { hasSameOriginHeader, isSameOriginRequest } from './origin'

const request = (method: string, headers: Record<string, string> = {}) => new Request('http://localhost:3000/_serverFn/x', { method, headers })

describe('same-origin rule', () => {
  it('lets safe methods through', () => {
    expect(isSameOriginRequest(request('GET'))).toBe(true)
  })

  it('needs this origin and the CSRF header on a state-changing request', () => {
    const csrf = { 'x-csrf-token': '1' }
    expect(isSameOriginRequest(request('POST', { origin: 'http://localhost:3000', ...csrf }))).toBe(true)
    expect(isSameOriginRequest(request('POST', { referer: 'http://localhost:3000/events', ...csrf }))).toBe(true)
    expect(isSameOriginRequest(request('POST', { origin: 'http://localhost:3000' }))).toBe(false)
    expect(isSameOriginRequest(request('POST', { origin: 'https://evil.example.test', ...csrf }))).toBe(false)
    expect(isSameOriginRequest(request('POST'))).toBe(false)
  })

  it('is checked on sign-out even as a GET', () => {
    expect(hasSameOriginHeader(request('GET'))).toBe(false)
    expect(hasSameOriginHeader(request('GET', { referer: 'http://localhost:3000/' }))).toBe(true)
  })
})
