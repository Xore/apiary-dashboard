import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/auth-events')({
  component: AuthEventsPage,
})

function AuthEventsPage() {
  return <PendingPage title="Auth-failure events" issue={9} />
}
