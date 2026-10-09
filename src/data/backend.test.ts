import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runForRequest } from './backend'
import { ApiError } from './errors'
import { SOURCES } from './mock/fixtures'

const responseStatus = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => new Request('http://dashboard.test/events'),
  setResponseStatus: responseStatus,
}))

vi.mock('#/server/identity', () => ({
  resolveUser: vi.fn(async () => undefined),
}))

const facets = {
  sensors: [],
  sources: [{ value: 'live-source.example', count: 1 }],
  countries: [],
  protocols: [],
  ports: [],
  signatures: [],
  kinds: [],
  personas: [],
  providers: [],
  cities: [],
}

beforeEach(() => {
  process.env.BACKEND_URL = 'http://backend.test'
  process.env.SERVICE_TOKEN = 'test-token'
  delete process.env.APIARY_ALLOW_UNAUTH_DEV
  responseStatus.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.BACKEND_URL
  delete process.env.SERVICE_TOKEN
  process.env.APIARY_ALLOW_UNAUTH_DEV = '1'
})

describe('production request routing', () => {
  it('ignores a mock scenario and returns the live getFacets response', async () => {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url)
        return Response.json(facets)
      }),
    )

    const result = await runForRequest('getFacets', ['events', {}], 'empty')

    expect(result).toEqual(facets)
    expect(new URL(calls[0]).pathname).toBe('/api/v1/facets/events')
    expect(JSON.stringify(result)).not.toContain(SOURCES[0].ip)
  })

  it('uses the live backend for the default scenario even with the development override', async () => {
    process.env.APIARY_ALLOW_UNAUTH_DEV = '1'
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url)
        return Response.json(facets)
      }),
    )

    expect(await runForRequest('getFacets', ['events', {}], 'normal')).toEqual(facets)
    expect(calls).toHaveLength(1)
  })

  it('returns the backend ApiError instead of fixtures when a live read cannot connect', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('ECONNREFUSED')
      }),
    )

    const error = await runForRequest('getFacets', [], undefined).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'unavailable', status: 502, backendUnreachable: true })
    expect(responseStatus).toHaveBeenCalledWith(502)
  })

  it('returns an explicit not-available error for an unwired query', async () => {
    const error = await runForRequest('getSessionSummary', [], undefined).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toContain('not available on live backend')
    expect(responseStatus).toHaveBeenCalledWith(502)
  })
})
