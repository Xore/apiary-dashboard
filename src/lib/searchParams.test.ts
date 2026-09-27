import { expect, it } from 'vitest'
import { textParam } from './searchParams'

it('keeps typed text, including what the router parsed as a number', () => {
  expect(textParam('root')).toBe('root')
  expect(textParam(192)).toBe('192')
  expect(textParam(198.51)).toBe('198.51')
  expect(textParam('')).toBeUndefined()
  expect(textParam('  ')).toBeUndefined()
  expect(textParam(undefined)).toBeUndefined()
  expect(textParam({ a: 1 })).toBeUndefined()
})
