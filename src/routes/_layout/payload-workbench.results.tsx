import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/payload-workbench/results')({
  component: PayloadWorkbenchResultsPage,
})

function PayloadWorkbenchResultsPage() {
  return <PendingPage title="Analysis results" issue={11} />
}
