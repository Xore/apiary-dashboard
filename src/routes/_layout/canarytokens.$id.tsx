import { SkeletonPanels } from '#/components/EntityBlocks'
import { Pending } from '#/components/Pending'
import { orPending } from '#/lib/pending'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { TokenInspector } from '#/components/details/Canary'
import { getCanarytokens } from '#/data/queries'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/canarytokens/$id')({
  loader: async ({ params }) => {
    const { tokens, triggers } = await getCanarytokens()
    const token = tokens.find((t) => t.id === params.id)
    if (!token) throw notFound()
    return { ...token, triggers }
  },
  notFoundComponent: () => (
    <NotFound title="Canarytoken" description="No canarytoken has this id." />
  ),
  component: CanaryTokenPage,
  pendingComponent: CanaryTokenPage,
})

function CanaryTokenPage() {
  const d = orPending(Route.useLoaderData())
  const { id } = Route.useParams()
  return (
    <EntityFrame
      kind="Canarytoken"
      title={<Pending width={280}>{d?.memo}</Pending>}
      basePath={`/canarytokens/${encodeURIComponent(id)}`}
      facts={[
        { label: 'Type', value: d?.type },
        { label: 'Created', value: d && formatDateTime(d.createdAt) },
        { label: 'By', value: d?.createdBy },
      ]}
    >
      {d ? <TokenInspector token={d} triggers={d.triggers} /> : <SkeletonPanels />}
    </EntityFrame>
  )
}
