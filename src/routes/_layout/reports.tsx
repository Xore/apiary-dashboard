import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/reports')({
  component: ReportsPage,
})

function ReportsPage() {
  return <PendingPage title="Reports studio" issue={11} />
}
