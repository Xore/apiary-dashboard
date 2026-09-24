// @vitest-environment jsdom
// The app's value-filter control: every value listed under the field with a
// search that narrows it, several values at once, and typing to open.
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '#/themes/neutral/neutral'
import { FilterSelect, listParam, toParam } from './FilterSelect'

const OPTIONS = [
  { value: 'cowrie-vps-01', count: 299 },
  { value: 'cowrie-home-01', count: 334 },
  { value: 'dionaea-vps-01', count: 473 },
]

let last: string[] = []
function Harness({ mode, allowCustom }: { mode?: 'single' | 'multiple'; allowCustom?: boolean }) {
  const [value, setValue] = useState<string[]>([])
  return (
    <Theme theme={neutralTheme}>
      <FilterSelect
        label="Sensor"
        options={OPTIONS}
        value={value}
        mode={mode}
        allowCustom={allowCustom}
        onChange={(next) => {
          last = next
          setValue(next)
        }}
      />
    </Theme>
  )
}

const search = () => screen.findByPlaceholderText('Search 3 values')

afterEach(() => {
  cleanup()
  last = []
})

describe('FilterSelect', () => {
  it('lists every value with its count and narrows as you type', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: /Sensor/ }))
    expect(await screen.findByRole('checkbox', { name: 'dionaea-vps-01' })).toBeTruthy()
    expect(screen.getByText('473')).toBeTruthy()
    await user.type(await search(), 'cowrie')
    expect(screen.queryByRole('checkbox', { name: 'dionaea-vps-01' })).toBeNull()
    expect(screen.getByText('2 of 3 match')).toBeTruthy()
  })

  it('takes several values, and Select matches adds every hit', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: /Sensor/ }))
    await user.click(await screen.findByRole('checkbox', { name: 'dionaea-vps-01' }))
    expect(last).toEqual(['dionaea-vps-01'])
    await user.type(await search(), 'cowrie')
    await user.click(screen.getByRole('button', { name: 'Select matches' }))
    expect(new Set(last)).toEqual(new Set(['dionaea-vps-01', 'cowrie-vps-01', 'cowrie-home-01']))
  })

  it('adds typed text as a value of its own when allowed', async () => {
    const user = userEvent.setup()
    render(<Harness allowCustom />)
    await user.click(screen.getByRole('button', { name: /Sensor/ }))
    await user.type(await search(), 'tanner')
    await user.click(screen.getByRole('button', { name: 'Add “tanner”' }))
    expect(last).toEqual(['tanner'])
  })

  it('picks exactly one value in single mode and closes', async () => {
    const user = userEvent.setup()
    render(<Harness mode="single" />)
    await user.click(screen.getByRole('button', { name: /Sensor/ }))
    await user.click(await screen.findByRole('checkbox', { name: 'cowrie-home-01' }))
    await user.click(screen.getByRole('button', { name: /Sensor/ }))
    await user.click(await screen.findByRole('checkbox', { name: 'dionaea-vps-01' }))
    expect(last).toEqual(['dionaea-vps-01'])
  })

  it('opens with the typed key already searched', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    screen.getByRole('button', { name: /Sensor/ }).focus()
    await user.keyboard('di')
    expect(((await search()) as HTMLInputElement).value).toBe('di')
  })
})

describe('list params', () => {
  it('round-trip comma lists and accept single legacy values', () => {
    expect(listParam('a,b')).toEqual(['a', 'b'])
    expect(listParam(22)).toEqual(['22'])
    expect(listParam(undefined)).toEqual([])
    expect(toParam([])).toBeUndefined()
    expect(toParam(['a', 'b'])).toBe('a,b')
  })
})
