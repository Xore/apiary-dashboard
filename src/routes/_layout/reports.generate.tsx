import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageFrame } from '#/components/PageFrame'
import { ReportWizard, emptyDraft } from '#/components/reports/ReportWizard'
import { getFacets, getReports } from '#/data/queries'

export const Route = createFileRoute('/_layout/reports/generate')({
  // ?template= starts from a template, ?from= re-opens a Library definition.
  validateSearch: (search: Record<string, unknown>): { template?: string; from?: string } => ({
    template: typeof search.template === 'string' && search.template ? search.template : undefined,
    from: typeof search.from === 'string' && search.from ? search.from : undefined,
  }),
  loader: async () => {
    const [data, facets] = await Promise.all([getReports(), getFacets()])
    return { data, facets }
  },
  component: GeneratePage,
})

function GeneratePage() {
  const { data, facets } = Route.useLoaderData()
  const { template, from } = Route.useSearch()
  // Bumping the key starts a fresh wizard after a report was generated.
  const [run, setRun] = useState(0)
  const source = from ? data.definitions.find((d) => d.id === from) : undefined
  const initial = source && run === 0 ? structuredClone(source) : emptyDraft(data, template)

  return (
    <PageFrame
      title={source && run === 0 ? `Generate: ${source.name}` : 'Generate a report'}
      description="Decide what the report covers and how it looks; the data is checked and each section rendered before the PDF is made."
      contentWidth={800}
    >
      <ReportWizard key={`${from ?? template ?? ''}-${run}`} data={data} facets={facets} initial={initial} onRestart={() => setRun((n) => n + 1)} />
    </PageFrame>
  )
}
