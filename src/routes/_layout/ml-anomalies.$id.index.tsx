import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { AnomalyFacts } from '#/components/details/Anomaly'

const parent = getRouteApi('/_layout/ml-anomalies/$id')

export const Route = createFileRoute('/_layout/ml-anomalies/$id/')({
  component: () => <AnomalyFacts anomaly={parent.useLoaderData().anomaly} />,
})
