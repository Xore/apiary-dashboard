import { pageSsr } from '#/lib/pageSsr'
import { SkeletonPanels } from '#/components/EntityBlocks'
import { Pending } from '#/components/Pending'
import { orPending } from '#/lib/pending'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { TriggerInspector } from '#/components/details/Canary'
import { getCanarytokens } from '#/data/queries'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/canarytokens/triggers/$id')({
  ssr: pageSsr,
  loader: async ({ params }) => {
    const trigger = (await getCanarytokens()).triggers.find(
      (t) => t.id === params.id,
    )
    if (!trigger) throw notFound()
    return trigger
  },
  notFoundComponent: () => (
    <NotFound
      title="Canarytoken trigger"
      description="No canarytoken trigger has this id."
    />
  ),
  component: CanaryTriggerPage,
  pendingComponent: CanaryTriggerPage,
})

function CanaryTriggerPage() {
  const d = orPending(Route.useLoaderData())
  const { id } = Route.useParams()
  return (
    <EntityFrame
      kind="Canarytoken trigger"
      title={<Pending width={280}>{d && `${d.memo} fired`}</Pending>}
      basePath={`/canarytokens/triggers/${encodeURIComponent(id)}`}
      facts={[
        { label: 'Fired', value: d && formatDateTime(d.triggeredAt) },
        { label: 'From', value: d?.srcIp },
        { label: 'Location', value: d?.location },
      ]}
    >
      {d ? <TriggerInspector trigger={d} /> : <SkeletonPanels />}
    </EntityFrame>
  )
}
