// @vitest-environment jsdom
// The dialog wizard: messages wait for a Continue attempt, a broken step
// blocks the way forward, and finishing runs the action and closes.
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '#/themes/neutral/neutral'
import { WizardDialog, statusOf } from './WizardDialog'

let finished: string[] = []
function Harness() {
  const [open, setOpen] = useState(true)
  const [name, setName] = useState('')
  return (
    <Theme theme={neutralTheme}>
      <p>{open ? 'open' : 'closed'}</p>
      <WizardDialog
        title="Make a thing"
        isOpen={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setName('')
        }}
        finishLabel="Make it"
        onFinish={() => {
          finished.push(name)
        }}
        steps={[
          {
            label: 'Name',
            errors: name.trim() ? {} : { name: 'Name it first.' },
            render: (shown) => <TextInput label="Name" value={name} onChange={setName} status={statusOf(shown, 'name')} />,
          },
          { label: 'Review', errors: {}, render: () => <p>{`About to make ${name}`}</p> },
        ]}
      />
    </Theme>
  )
}

afterEach(() => {
  cleanup()
  finished = []
})

describe('WizardDialog', () => {
  it('shows a step’s messages only after Continue, and will not pass a broken step', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.queryByText('Name it first.')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Name it first.')).toBeTruthy()
    expect(screen.getByText('One problem above needs fixing first.')).toBeTruthy()
    expect(screen.queryByText(/About to make/)).toBeNull()
  })

  it('runs the finish action on the last step and closes', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText(/Name/), 'widget')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('About to make widget')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Make it' }))
    expect(finished).toEqual(['widget'])
    expect(await screen.findByText('closed')).toBeTruthy()
  })
})
