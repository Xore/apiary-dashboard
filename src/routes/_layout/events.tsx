import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/events')({
  component: EventsPage,
})

function EventsPage() {
  return <PendingPage title="Event explorer" issue={10} />
}
