import { textParam } from '#/lib/searchParams'
import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { clusterHref } from '#/lib/entities'

// Moved to the cluster (or ASN) entity page (epic #25).
export const Route = createFileRoute('/_layout/investigate/cluster')({
  validateSearch: (search: Record<string, unknown>): { kind?: string; value?: string } => ({
    kind: typeof search.kind === 'string' ? search.kind : undefined,
    value: textParam(search.value),
  }),
  beforeLoad: ({ search }) => {
    if (!search.kind || !search.value) throw notFound()
    throw redirect({ href: clusterHref(search.kind, search.value), statusCode: 301 })
  },
})
