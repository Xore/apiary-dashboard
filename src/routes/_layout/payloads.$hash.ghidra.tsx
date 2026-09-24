import { Text } from '@astryxdesign/core/Text'
import { createFileRoute } from '@tanstack/react-router'
import { GhidraResult } from '#/components/analyzers/GhidraResult'
import { getGhidraAnalysis } from '#/data/queries'

export const Route = createFileRoute('/_layout/payloads/$hash/ghidra')({
  validateSearch: (search: Record<string, unknown>): { fn?: string } => ({
    fn: typeof search.fn === 'string' && search.fn ? search.fn : undefined,
  }),
  loader: ({ params }) => getGhidraAnalysis(params.hash),
  component: () => {
    const g = Route.useLoaderData()
    const { fn } = Route.useSearch()
    return g ? <GhidraResult g={g} fn={fn} /> : <Text type="supporting">No Ghidra decompilation. Shell scripts are not decompiled.</Text>
  },
})
