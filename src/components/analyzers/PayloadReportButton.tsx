// "Payload report": generates the sample's PDF report and shows it in the
// browser's own PDF viewer, with a way out to a tab of its own.
import { useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { VStack } from '@astryxdesign/core/Stack'
import { generatePayloadReport } from '#/data/queries'
import type { GeneratedReport } from '#/data/types'
import { reportPdfHref } from '#/lib/reportPdf'
import { useGuardedAction } from '#/lib/useGuardedAction'

export function PayloadReportButton({ hash }: { hash: string }) {
  const [report, setReport] = useState<GeneratedReport | null>(null)
  const [busy, setBusy] = useState(false)
  const { error, guard, clearError } = useGuardedAction()
  const generate = async () => {
    setBusy(true)
    const made = await guard(() => generatePayloadReport(hash))
    setBusy(false)
    if (made) setReport(made)
  }
  const pdf = report ? reportPdfHref(report) : undefined
  return (
    <>
      <Button label="Payload report" size="sm" variant="secondary" isLoading={busy} onClick={() => void generate()} />
      <Dialog isOpen={report !== null || error !== undefined} onOpenChange={(open) => !open && (setReport(null), clearError())} width={960} purpose="info">
        <Layout
          padding={4}
          header={
            <DialogHeader
              title={report?.title ?? 'Payload report'}
              onOpenChange={(open) => !open && (setReport(null), clearError())}
              endContent={pdf && <Button label="Open in new tab" size="sm" variant="secondary" href={pdf} target="_blank" rel="noopener noreferrer" />}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                {error && <Banner status="error" title="The report was not generated" description={error} />}
                {pdf && <iframe title={`${report?.title ?? 'Payload report'} (PDF)`} src={pdf} style={{ width: '100%', height: '72vh', border: 0, borderRadius: 8 }} />}
              </VStack>
            </LayoutContent>
          }
        />
      </Dialog>
    </>
  )
}
