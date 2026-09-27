import { Pending } from '#/components/Pending'
import { orPending } from '#/lib/pending'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { StatusToken } from '#/components/details/Anomaly'
import { EntityFrame } from '#/components/EntityFrame'
import { entityTabs } from '#/components/ViewTabs'
import type { ViewTab } from '#/components/ViewTabs'
import { EntityLink } from '#/components/EntityLink'
import { NotFound } from '#/components/NotFound'
import { SeverityToken } from '#/components/SeverityToken'
import { getAnomaly } from '#/data/queries'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/ml-anomalies/$id')({
  staticData: { viewTabs: entityTabs({ label: 'ML anomaly views', basePath: (params) => `/ml-anomalies/${encodeURIComponent(params.id)}`, tabs: tabsFor }) },
  loader: async ({ params }) => {
    const detail = await getAnomaly(params.id)
    if (!detail) throw notFound()
    return detail
  },
  notFoundComponent: () => (
    <NotFound title="ML anomaly" description="No anomaly has this id." />
  ),
  component: AnomalyLayout,
  pendingComponent: AnomalyLayout,
})

function AnomalyLayout() {
  const loaded = orPending(Route.useLoaderData())
  const { id } = Route.useParams()
  const a = loaded?.anomaly
  return (
    <EntityFrame
      kind="ML anomaly"
      title={<Pending width={320}>{a && a.explanation}</Pending>}
      basePath={`/ml-anomalies/${encodeURIComponent(id)}`}
      tokens={a && (<>
          <SeverityToken severity={a.severity} />
          <StatusToken status={a.status} />
        </>)}
      facts={[
        { label: 'Composite score', value: a && (a.compositeScore.toFixed(2))},
        { label: 'Threshold', value: a && (a.thresholdAtScoring.toFixed(2))},
        { label: 'Time', value: a && (formatDateTime(a.timestamp))},
        {
          label: 'Source',
          value: a && (a.srcIp ? (
            <EntityLink kind="source" id={a.srcIp} />
          ) : (
            'unattributed'
          )),
        },
        { label: 'Sensor', value: a && (<EntityLink kind="sensor" id={a.sensor} />)},
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}

/** The top-bar tabs; none of them carries a count. */
function tabsFor(): ViewTab[] {
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'scores', label: 'Model scores' },
    { id: 'event', label: 'Source event' },
    { id: 'triage', label: 'Triage' },
  ]
}
