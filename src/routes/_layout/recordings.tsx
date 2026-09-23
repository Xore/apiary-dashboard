import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/recordings')({
  component: RecordingsPage,
})

function RecordingsPage() {
  return <PendingPage title="Session recordings" issue={10} />
}
