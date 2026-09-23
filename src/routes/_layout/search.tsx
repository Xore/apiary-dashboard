import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/search')({
  component: SearchPage,
})

function SearchPage() {
  return <PendingPage title="Search" issue={12} />
}
