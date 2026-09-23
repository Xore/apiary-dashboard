import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/alerts')({
  component: AlertsPage,
})

function AlertsPage() {
  return <PendingPage title="Alerts" issue={11} />
}
