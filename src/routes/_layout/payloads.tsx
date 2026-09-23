import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/payloads')({
  component: PayloadsPage,
})

function PayloadsPage() {
  return <PendingPage title="Captured payloads" issue={11} />
}
