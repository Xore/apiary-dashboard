import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/canarytokens')({
  component: CanarytokensPage,
})

function CanarytokensPage() {
  return <PendingPage title="Canarytokens" issue={11} />
}
