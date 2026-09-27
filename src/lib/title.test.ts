import { expect, it } from 'vitest'
import { formatTitle, titleFormatProblem } from './title'

const values = { page: 'Event explorer', app: 'APIARY', section: 'Investigate' }

it('fills in the placeholders', () => {
  expect(formatTitle('{page} — {app}', values)).toBe('Event explorer — APIARY')
  expect(formatTitle('{app} | {section} | {page}', values)).toBe('APIARY | Investigate | Event explorer')
  expect(formatTitle('', values)).toBe('Event explorer — APIARY')
})

it('leaves no stray separator for an empty section', () => {
  expect(formatTitle('{page} · {section} · {app}', { ...values, section: '' })).toBe('Event explorer · APIARY')
  expect(formatTitle('{section} — {page}', { ...values, section: '' })).toBe('Event explorer')
})

it('refuses a format without the page or with unknown placeholders', () => {
  expect(titleFormatProblem('{page} — {app}')).toBeUndefined()
  expect(titleFormatProblem('{app}')).toMatch(/\{page\}/)
  expect(titleFormatProblem('{page} {host}')).toMatch(/\{host\}/)
})
