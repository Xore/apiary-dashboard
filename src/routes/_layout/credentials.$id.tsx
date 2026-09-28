import { pageSsr } from '#/lib/pageSsr'
import { SkeletonPanels } from '#/components/EntityBlocks'
import { Pending } from '#/components/Pending'
import { orPending } from '#/lib/pending'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { CredentialInspector } from '#/components/details/BaitCredential'
import { getCredentials } from '#/data/queries'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/credentials/$id')({
  ssr: pageSsr,
  loader: async ({ params }) => {
    const { credentials, tokens } = await getCredentials()
    const credential = credentials.find((c) => c.id === params.id)
    if (!credential) throw notFound()
    return { ...credential, tokens }
  },
  notFoundComponent: () => (
    <NotFound
      title="Bait credential"
      description="No bait credential has this id."
    />
  ),
  component: BaitCredentialPage,
  pendingComponent: BaitCredentialPage,
})

function BaitCredentialPage() {
  const d = orPending(Route.useLoaderData())
  const { id } = Route.useParams()
  return (
    <EntityFrame
      kind="Bait credential"
      title={<Pending width={280}>{d && `${d.username} @ ${d.target}`}</Pending>}
      basePath={`/credentials/${encodeURIComponent(id)}`}
      facts={[
        { label: 'Planted', value: d && formatDateTime(d.createdAt) },
        { label: 'Path', value: d?.path },
        { label: 'Template', value: d?.template },
      ]}
    >
      {d ? <CredentialInspector key={d.id} credential={d} tokens={d.tokens} /> : <SkeletonPanels />}
    </EntityFrame>
  )
}
