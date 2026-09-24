import { createFileRoute, notFound } from '@tanstack/react-router'
import { CredentialInspector } from '#/components/details/BaitCredential'
import { getCredentials } from '#/data/queries'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/credentials/$id')({
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
})

function BaitCredentialPage() {
  const d = Route.useLoaderData()
  return (
    <EntityFrame
      kind="Bait credential"
      title={`${d.username} @ ${d.target}`}
      basePath={`/credentials/${encodeURIComponent(d.id)}`}
      facts={[
        { label: 'Planted', value: formatDateTime(d.createdAt) },
        { label: 'Path', value: d.path },
        { label: 'Template', value: d.template },
      ]}
      tabs={[{ id: 'overview', label: 'Overview' }]}
    >
      <CredentialInspector key={d.id} credential={d} tokens={d.tokens} />
    </EntityFrame>
  )
}
