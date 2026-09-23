import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/dead-letters')({
  component: DeadLettersPage,
})

function DeadLettersPage() {
  return <PendingPage title="Ingest dead letters" issue={12} />
}
