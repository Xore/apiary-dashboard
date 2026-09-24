import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { StatusToken } from '#/components/details/Anomaly'
import { EntityFrame } from '#/components/EntityFrame'
import { EntityLink } from '#/components/EntityLink'
import { NotFound } from '#/components/NotFound'
import { SeverityToken } from '#/components/SeverityToken'
import { getAnomaly } from '#/data/queries'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/ml-anomalies/$id')({
  loader: async ({ params }) => {
    const detail = await getAnomaly(params.id)
    if (!detail) throw notFound()
    return detail
  },
  notFoundComponent: () => (
    <NotFound title="ML anomaly" description="No anomaly has this id." />
  ),
  component: AnomalyLayout,
})

function AnomalyLayout() {
  const { anomaly: a } = Route.useLoaderData()
  return (
    <EntityFrame
      kind="ML anomaly"
      title={a.explanation}
      basePath={`/ml-anomalies/${encodeURIComponent(a.id)}`}
      tokens={
        <>
          <SeverityToken severity={a.severity} />
          <StatusToken status={a.status} />
        </>
      }
      facts={[
        { label: 'Composite score', value: a.compositeScore.toFixed(2) },
        { label: 'Threshold', value: a.thresholdAtScoring.toFixed(2) },
        { label: 'Time', value: formatDateTime(a.timestamp) },
        {
          label: 'Source',
          value: a.srcIp ? (
            <EntityLink kind="source" id={a.srcIp} />
          ) : (
            'unattributed'
          ),
        },
        { label: 'Sensor', value: <EntityLink kind="sensor" id={a.sensor} /> },
      ]}
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'scores', label: 'Model scores' },
        { id: 'event', label: 'Source event' },
        { id: 'triage', label: 'Triage' },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}
