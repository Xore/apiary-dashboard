/**
 * A short wizard in a modal (Astryx `form-wizard-dialog`): create something
 * without leaving the list it belongs to. A compact stepper marks the
 * position, Back and Continue in the footer are the whole navigation model,
 * and `purpose="form"` keeps a stray backdrop click from discarding a
 * half-finished draft (Escape and the close button still exit).
 *
 * Each step brings its own content and validation. A step's messages appear
 * once Continue has been tried on it, and a step left broken stays flagged in
 * the stepper. The owner resets its draft in `onOpenChange(false)`, which is
 * also what a successful finish calls, so the next opening starts clean.
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FieldStatus } from '@astryxdesign/core/FieldStatus'
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from '@astryxdesign/core/Layout'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { Step, Stepper } from '@astryxdesign/core/Stepper'
import { describeError } from '#/lib/actionError'

export type WizardStep = {
  label: string
  /** Field id → message, for whatever blocks this step right now. */
  errors: Record<string, string>
  /** Renders the step; `shown` holds the messages to display under fields. */
  render: (shown: Record<string, string>) => ReactNode
}

type WizardDialogProps = {
  title: string
  isOpen: boolean
  /** Called with false on close and after a successful finish; reset there. */
  onOpenChange: (isOpen: boolean) => void
  steps: WizardStep[]
  finishLabel: string
  /** Runs on the last step's button; resolve to close, throw to stay open. */
  onFinish: () => Promise<void> | void
  width?: number
}

const blockedMessage = (count: number) => (count === 1 ? 'One problem above needs fixing first.' : `${count} problems above need fixing first.`)

export function WizardDialog({ title, isOpen, onOpenChange, steps, finishLabel, onFinish, width = 620 }: WizardDialogProps) {
  const [step, setStep] = useState(0)
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string>()

  const close = (open: boolean) => {
    if (!open) {
      setStep(0)
      setAttempted(new Set())
      setFailure(undefined)
    }
    onOpenChange(open)
  }
  const shown = (index: number) => (attempted.has(index) ? steps[index].errors : {})
  const current = Math.min(step, steps.length - 1)
  const currentErrors = shown(current)
  const isLast = current === steps.length - 1

  const next = async () => {
    setAttempted((prev) => new Set(prev).add(current))
    if (Object.keys(steps[current].errors).length !== 0) return
    if (!isLast) {
      setStep(current + 1)
      return
    }
    setBusy(true)
    setFailure(undefined)
    try {
      await onFinish()
      close(false)
    } catch (e) {
      // The draft stays, so the operator can retry without re-entering it.
      setFailure(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={close} width={width} purpose="form">
      <Layout
        height="fill"
        padding={4}
        defaultHasDividers
        header={
          <>
            <DialogHeader title={title} onOpenChange={close} hasDivider={false} />
            <LayoutHeader hasDivider={false}>
              <Stepper activeStep={current} orientation="horizontal" density="compact" label={`${title} progress`}>
                {steps.map((s, i) => (
                  <Step key={s.label} step={i} label={s.label} status={Object.keys(shown(i)).length > 0 ? 'error' : undefined} />
                ))}
              </Stepper>
            </LayoutHeader>
          </>
        }
        content={
          <LayoutContent>
            <VStack gap={5}>{steps[current].render(currentErrors)}</VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              <Button label="Back" variant="secondary" isDisabled={current === 0 || busy} onClick={() => setStep(Math.max(0, current - 1))} />
              <StackItem size="fill" />
              {Object.keys(currentErrors).length > 0 && <FieldStatus type="error" variant="detached" message={blockedMessage(Object.keys(currentErrors).length)} />}
              {failure && isLast && <FieldStatus type="error" variant="detached" message={failure} />}
              <Button label={isLast ? finishLabel : 'Continue'} variant="primary" isLoading={busy} onClick={() => void next()} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}

/** `{ type: 'error', message }` for a field's message, if it has one. */
export const statusOf = (shown: Record<string, string>, key: string) => (shown[key] ? { type: 'error' as const, message: shown[key] } : undefined)
