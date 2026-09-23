import { createFileRoute, notFound } from '@tanstack/react-router'
import { CorrelationView } from '#/components/CorrelationView'
import { NotFound } from '#/components/NotFound'
import { getCidrCorrelation } from '#/data/queries'

// {cidr} carries a literal "/", so every link percent-encodes it.
export const Route = createFileRoute('/_layout/investigate/cidr/$cidr')({
  loader: async ({ params }) => {
    const correlation = await getCidrCorrelation(params.cidr)
    if (!correlation) throw notFound()
    return correlation
  },
  notFoundComponent: () => (
    <NotFound title="CIDR investigation" description="This network could not be correlated: invalid range, or no source in it was seen." />
  ),
  component: CidrPage,
})

function CidrPage() {
  const correlation = Route.useLoaderData()
  return (
    <CorrelationView
      title={correlation.title}
      description="Everything correlated for this network across honeypot, Suricata, and portbridge tunnel records."
      correlation={correlation}
    />
  )
}
