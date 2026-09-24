import { createFileRoute, notFound } from '@tanstack/react-router'
import { DeadLetterDetail } from '#/components/details/DeadLetter'
import { getDeadLetters } from '#/data/queries'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/dead-letters/$id')({
  loader: async ({ params }) => {
    const row = (await getDeadLetters('')).find((r) => r.id === params.id)
    if (!row) throw notFound()
    return row
  },
  notFoundComponent: () => (
    <NotFound
      title="Ingest dead letter"
      description="No rejected document has this id; it may have been purged."
    />
  ),
  component: DeadLetterPage,
})

function DeadLetterPage() {
  const d = Route.useLoaderData()
  return (
    <EntityFrame
      kind="Ingest dead letter"
      title={d.index}
      basePath={`/dead-letters/${encodeURIComponent(d.id)}`}
      facts={[
        { label: 'Rejected', value: formatDateTime(d.timestamp) },
        { label: 'Source', value: d.source },
      ]}
    >
      <DeadLetterDetail row={d} />
    </EntityFrame>
  )
}
