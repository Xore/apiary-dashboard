import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/commands')({
  component: CommandsPage,
})

function CommandsPage() {
  return <PendingPage title="Executed commands" issue={10} />
}
