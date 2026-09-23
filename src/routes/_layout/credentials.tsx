import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/credentials')({
  component: CredentialsPage,
})

function CredentialsPage() {
  return <PendingPage title="Credentials" issue={11} />
}
