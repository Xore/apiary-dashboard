import { createFileRoute, notFound } from '@tanstack/react-router'
import { TriggerInspector } from '#/components/details/Canary'
import { getCanarytokens } from '#/data/queries'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/canarytokens/triggers/$id')({
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
})

function CanaryTriggerPage() {
  const d = Route.useLoaderData()
  return (
    <EntityFrame
      kind="Canarytoken trigger"
      title={`${d.memo} fired`}
      basePath={`/canarytokens/triggers/${encodeURIComponent(d.id)}`}
      facts={[
        { label: 'Fired', value: formatDateTime(d.triggeredAt) },
        { label: 'From', value: d.srcIp },
        { label: 'Location', value: d.location },
      ]}
    >
      <TriggerInspector trigger={d} />
    </EntityFrame>
  )
}
