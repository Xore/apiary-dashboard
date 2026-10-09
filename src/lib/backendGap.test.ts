import { describe, expect, it } from 'vitest'
import { ApiError } from '#/data/errors'
import { isBackendGap, backendGapOf } from './backendGap'

describe('backendGapOf', () => {
  it('passes an answer through unchanged', async () => {
    expect(await backendGapOf(Promise.resolve([1, 2]))).toEqual([1, 2])
  })

  it('turns an unavailable read into a marker that carries the gap', async () => {
    const gap = new ApiError('unavailable', 'getRelated', { detail: 'not available from the backend yet (Xore/APIARY#3554)' })
    const result = await backendGapOf(Promise.reject(gap))
    expect(isBackendGap(result)).toBe(true)
    expect(result).toEqual({ gap: 'not available from the backend yet (Xore/APIARY#3554)' })
  })

  it('rethrows every other failure, so a sign-in or a refusal still reaches the page', async () => {
    await expect(backendGapOf(Promise.reject(new ApiError('expired', 'getRelated')))).rejects.toMatchObject({ kind: 'expired' })
    await expect(backendGapOf(Promise.reject(new ApiError('forbidden', 'getRelated')))).rejects.toMatchObject({ kind: 'forbidden' })
  })
})
