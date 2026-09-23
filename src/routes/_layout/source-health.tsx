import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/source-health')({
  component: SourceHealthPage,
})

function SourceHealthPage() {
  return <PendingPage title="Source & pipeline health" issue={11} />
}
