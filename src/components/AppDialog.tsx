// Every modal in the dashboard behaves the same (#118): a click on the scrim,
// Escape, and the close button all close it; one holding unsaved input asks
// before discarding it; widths come from the kind of dialog; on a phone it
// is a full-height sheet. Focus moves in on open, is trapped while open, and
// returns to the opener on close (the native <dialog> under Astryx's Dialog).
import { Button } from '@astryxdesign/core/Button'
import type { ButtonVariant } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { HStack, StackItem } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { createContext, useContext, useLayoutEffect, useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'

/** The control that last took focus outside a dialog, standing in for a
 * dropdown menu item by that menu's trigger button: an item is gone by the
 * time a dialog it opened closes (and a dialog opened through the URL, like
 * settings, mounts after the menu has already closed). */
let lastOpener: HTMLElement | null = null
if (typeof document !== 'undefined') {
  document.addEventListener(
    'focusin',
    (event) => {
      const el = event.target instanceof HTMLElement ? event.target : null
      if (!el || el.closest('dialog')) return
      const menu = el.closest('[role="menu"]')
      lastOpener = (menu?.id && document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(menu.id)}"]`)) || el
    },
    true,
  )
}

/** The open dialog's guarded close: what its own close button calls, so the
 * button, the scrim and Escape all ask before discarding. */
const RequestClose = createContext<() => void>(() => {})

/** A dialog's header, whose close button closes through the dialog's guard. */
export function AppDialogHeader(props: Omit<ComponentProps<typeof DialogHeader>, 'onOpenChange'>) {
  const requestClose = useContext(RequestClose)
  return <DialogHeader {...props} onOpenChange={(open) => !open && requestClose()} />
}

export type DialogKind = 'confirm' | 'form' | 'wizard' | 'large'

export const DIALOG_WIDTH: Record<DialogKind, number> = { confirm: 440, form: 560, wizard: 640, large: 960 }

type AppDialogProps = {
  isOpen: boolean
  /** Asked to close, by the scrim, Escape or the close button, and allowed to. */
  onClose: () => void
  kind?: DialogKind
  /** Overrides the kind's width, for a dialog whose content needs it. */
  width?: number
  /** Unsaved input: closing asks "Discard changes?" first. */
  isDirty?: boolean
  children: ReactNode
} & Pick<ComponentProps<typeof Dialog>, 'maxHeight' | 'padding' | 'aria-labelledby' | 'aria-label'>

export function AppDialog({ isOpen, onClose, kind = 'form', width, isDirty = false, children, ...rest }: AppDialogProps) {
  const phone = useMediaQuery('(max-width: 640px)')
  const [asking, setAsking] = useState(false)
  // Focus goes back to what opened the dialog (see lastOpener).
  useLayoutEffect(() => {
    if (!isOpen) return
    // By now the dialog may already hold focus (it opens itself first).
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const opener = active && active !== document.body && !active.closest('dialog') ? active : lastOpener
    return () => {
      if (opener?.isConnected) requestAnimationFrame(() => opener.focus())
    }
  }, [isOpen])
  const requestClose = () => (isDirty ? setAsking(true) : onClose())
  return (
    <>
      <Dialog
        isOpen={isOpen}
        onOpenChange={(open) => !open && requestClose()}
        purpose="info"
        variant={phone ? 'fullscreen' : 'standard'}
        width={width ?? DIALOG_WIDTH[kind]}
        {...rest}
      >
        <RequestClose.Provider value={requestClose}>{children}</RequestClose.Provider>
      </Dialog>
      {/* Only a dialog that can hold input has the question (a confirm
          never does, which is also what keeps this from nesting). */}
      {isDirty && (
        <ConfirmDialog
          isOpen={isOpen && asking}
          onOpenChange={setAsking}
          title="Discard changes?"
          description="What you entered in this dialog has not been saved."
          cancelLabel="Keep editing"
          actionLabel="Discard"
          actionVariant="destructive"
          onAction={() => {
            setAsking(false)
            onClose()
          }}
        />
      )}
    </>
  )
}

type ConfirmDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => unknown
  title: string
  description: ReactNode
  cancelLabel?: string
  actionLabel: string
  actionVariant?: ButtonVariant
  isActionLoading?: boolean
  onAction: () => unknown
  width?: number
}

/** A confirmation, with AlertDialog's props, that closes like every other
 * dialog: the scrim, Escape and the close button cancel, never act. */
export function ConfirmDialog({ isOpen, onOpenChange, title, description, cancelLabel = 'Cancel', actionLabel, actionVariant = 'primary', isActionLoading, onAction, width }: ConfirmDialogProps) {
  const cancel = () => void onOpenChange(false)
  return (
    <AppDialog isOpen={isOpen} onClose={cancel} kind="confirm" width={width}>
      <Layout
        padding={4}
        header={<AppDialogHeader title={title} hasDivider={false} />}
        content={<LayoutContent>{typeof description === 'string' ? <Text>{description}</Text> : description}</LayoutContent>}
        footer={
          <LayoutFooter hasDivider={false}>
            <HStack gap={2} vAlign="center">
              <StackItem size="fill" />
              <Button label={cancelLabel} variant="secondary" onClick={cancel} />
              <Button label={actionLabel} variant={actionVariant} isLoading={isActionLoading} onClick={() => void onAction()} />
            </HStack>
          </LayoutFooter>
        }
      />
    </AppDialog>
  )
}
