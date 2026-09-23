import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/investigate/lookup')({
  component: InvestigateLookupPage,
})

function InvestigateLookupPage() {
  return <PendingPage title="Hash / IOC lookup" issue={10} />
}
