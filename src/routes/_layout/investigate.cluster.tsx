import { createFileRoute, notFound } from '@tanstack/react-router'
import { CorrelationView } from '#/components/CorrelationView'
import { NotFound } from '#/components/NotFound'
import { getClusterCorrelation } from '#/data/queries'

// kind/value are separate query params, not a packed path segment: a shared
// value may contain spaces or slashes.
export const Route = createFileRoute('/_layout/investigate/cluster')({
  validateSearch: (search: Record<string, unknown>): { kind: string; value: string } => ({
    kind: typeof search.kind === 'string' ? search.kind : '',
    value: typeof search.value === 'string' ? search.value : '',
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const correlation = await getClusterCorrelation(deps.kind, deps.value)
    if (!correlation) throw notFound()
    return correlation
  },
  notFoundComponent: () => (
    <NotFound title="Cluster investigation" description="This cluster could not be correlated: unknown kind, or no member IPs." />
  ),
  component: ClusterPage,
})

function ClusterPage() {
  const correlation = Route.useLoaderData()
  return (
    <CorrelationView
      title={correlation.title}
      description="Everything correlated for the source IPs that share this signal."
      correlation={correlation}
    />
  )
}
