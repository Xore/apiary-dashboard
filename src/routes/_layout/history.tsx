import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/history')({
  component: HistoryPage,
})

function HistoryPage() {
  return <PendingPage title="Event history" issue={11} />
}
