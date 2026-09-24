import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { AnomalyTriage } from '#/components/details/Anomaly'

const parent = getRouteApi('/_layout/ml-anomalies/$id')

export const Route = createFileRoute('/_layout/ml-anomalies/$id/triage')({
  component: () => <AnomalyTriage anomaly={parent.useLoaderData().anomaly} />,
})
