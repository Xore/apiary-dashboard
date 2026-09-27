import { describe, expect, it } from 'vitest'
import { hasSameOriginHeader, isSameOriginRequest } from './origin'

const request = (method: string, headers: Record<string, string> = {}) => new Request('http://localhost:3000/_serverFn/x', { method, headers })

describe('same-origin rule', () => {
  it('lets safe methods through', () => {
    expect(isSameOriginRequest(request('GET'))).toBe(true)
  })

  it('needs this origin on a state-changing request', () => {
    expect(isSameOriginRequest(request('POST', { origin: 'http://localhost:3000' }))).toBe(true)
    expect(isSameOriginRequest(request('POST', { referer: 'http://localhost:3000/events' }))).toBe(true)
    expect(isSameOriginRequest(request('POST', { origin: 'https://evil.example.test' }))).toBe(false)
    expect(isSameOriginRequest(request('POST'))).toBe(false)
  })

  it('is checked on sign-out even as a GET', () => {
    expect(hasSameOriginHeader(request('GET'))).toBe(false)
    expect(hasSameOriginHeader(request('GET', { referer: 'http://localhost:3000/' }))).toBe(true)
  })
})
