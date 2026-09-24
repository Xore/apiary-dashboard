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
})

function CanaryTokenPage() {
  const d = Route.useLoaderData()
  return (
    <EntityFrame
      kind="Canarytoken"
      title={d.memo}
      basePath={`/canarytokens/${encodeURIComponent(d.id)}`}
      facts={[
        { label: 'Type', value: d.type },
        { label: 'Created', value: formatDateTime(d.createdAt) },
        { label: 'By', value: d.createdBy },
      ]}
      tabs={[{ id: 'overview', label: 'Overview' }]}
    >
      <TokenInspector token={d} triggers={d.triggers} />
    </EntityFrame>
  )
}
