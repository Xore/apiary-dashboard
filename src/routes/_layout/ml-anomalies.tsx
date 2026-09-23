import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/ml-anomalies')({
  component: MlAnomaliesPage,
})

function MlAnomaliesPage() {
  return <PendingPage title="ML anomalies" issue={9} />
}
