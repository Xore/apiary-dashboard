import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/problem-reports')({
  component: ProblemReportsPage,
})

function ProblemReportsPage() {
  return <PendingPage title="Problem reports" issue={12} />
}
