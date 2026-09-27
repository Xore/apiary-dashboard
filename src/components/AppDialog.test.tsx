// @vitest-environment jsdom
// One contract for every modal (#118): the scrim, Escape and the close
// button close it; unsaved input is asked about first; a confirmation's
// cancel paths never run its action.
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '#/themes/neutral/neutral-family'
import { AppDialog, AppDialogHeader, ConfirmDialog } from './AppDialog'

function Form({ isDirty = false }: { isDirty?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <Theme theme={neutralTheme}>
      <p>{open ? 'open' : 'closed'}</p>
      <AppDialog isOpen={open} onClose={() => setOpen(false)} isDirty={isDirty}>
        <Layout header={<AppDialogHeader title="Edit" />} content={<LayoutContent>body</LayoutContent>} />
      </AppDialog>
    </Theme>
  )
}

let acted = 0
function Confirm() {
  const [open, setOpen] = useState(true)
  return (
    <Theme theme={neutralTheme}>
      <p>{open ? 'open' : 'closed'}</p>
      <ConfirmDialog isOpen={open} onOpenChange={setOpen} title="Delete it?" description="Gone for good." actionLabel="Delete" onAction={() => void acted++} />
    </Theme>
  )
}

/** The <dialog> of the dialog titled `name`. */
const dialogOf = (name: string) => screen.getByText(name, { selector: 'h1, h2, h3, [id]' }).closest('dialog')!
/** A click on the scrim: on the <dialog> itself, outside its content. */
const clickScrim = (dialog: HTMLElement) => {
  fireEvent.mouseDown(dialog)
  fireEvent.mouseUp(dialog)
  fireEvent.click(dialog)
}
const pressEscape = (dialog: HTMLElement) => {
  fireEvent.keyDown(dialog, { key: 'Escape' })
  fireEvent(dialog, new Event('cancel', { cancelable: true }))
}

afterEach(() => {
  cleanup()
  acted = 0
})

describe('AppDialog', () => {
  it('closes on the scrim', () => {
    render(<Form />)
    clickScrim(dialogOf('Edit'))
    expect(screen.getByText('closed')).toBeTruthy()
  })

  it('closes on Escape', () => {
    render(<Form />)
    pressEscape(dialogOf('Edit'))
    expect(screen.getByText('closed')).toBeTruthy()
  })

  it('closes on its close button', async () => {
    render(<Form />)
    await userEvent.setup().click(screen.getByRole('button', { name: /close/i }))
    expect(screen.getByText('closed')).toBeTruthy()
  })

  it('asks before discarding unsaved input, by any way out', async () => {
    const user = userEvent.setup()
    render(<Form isDirty />)
    clickScrim(dialogOf('Edit'))
    expect(screen.getByText('open')).toBeTruthy()
    expect(screen.getByText('Discard changes?')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByText('open')).toBeTruthy()
    pressEscape(dialogOf('Edit'))
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.getByText('closed')).toBeTruthy()
  })
})

describe('ConfirmDialog', () => {
  it('cancels on the scrim, Escape and Cancel without acting', async () => {
    render(<Confirm />)
    clickScrim(dialogOf('Delete it?'))
    expect(screen.getByText('closed')).toBeTruthy()
    cleanup()
    render(<Confirm />)
    pressEscape(dialogOf('Delete it?'))
    expect(screen.getByText('closed')).toBeTruthy()
    cleanup()
    render(<Confirm />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('closed')).toBeTruthy()
    expect(acted).toBe(0)
  })

  it('acts on its action', async () => {
    render(<Confirm />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete' }))
    expect(acted).toBe(1)
  })
})
