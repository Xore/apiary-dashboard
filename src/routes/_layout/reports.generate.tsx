import { pageSsr } from '#/lib/pageSsr'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageFrame } from '#/components/PageFrame'
import { SkeletonPanels } from '#/components/EntityBlocks'
import { orPending } from '#/lib/pending'
import { REPORT_WIDE, ReportWizard, emptyDraft } from '#/components/reports/ReportWizard'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import { getFacets, getReports } from '#/data/queries'
import { backendGapOf } from '#/lib/backendGap'
import { reportTabs } from '#/lib/navFamilies'

export const Route = createFileRoute('/_layout/reports/generate')({
  ssr: pageSsr,
  staticData: { viewTabs: reportTabs },
  // ?template= starts from a template, ?from= re-opens a Library definition.
  validateSearch: (search: Record<string, unknown>): { template?: string; from?: string } => ({
    template: typeof search.template === 'string' && search.template ? search.template : undefined,
    from: typeof search.from === 'string' && search.from ? search.from : undefined,
  }),
  loader: async () => {
    // The pickers run without the counted facets until the backend serves them (#3524).
    const [data, facets] = await Promise.all([getReports(), backendGapOf(getFacets())])
    return { data, facets }
  },
  component: GeneratePage,
  pendingComponent: GeneratePage,
})

function GeneratePage() {
  const { data, facets } = orPending(Route.useLoaderData()) ?? {}
  const { template, from } = Route.useSearch()
  // Bumping the key starts a fresh wizard after a report was generated.
  const [run, setRun] = useState(0)
  // Wide: the steps and a live preview fill the page side by side.
  const wide = useMediaQuery(REPORT_WIDE)
  const source = from ? data?.definitions.find((d) => d.id === from) : undefined

  return (
    <PageFrame
      title={source && run === 0 ? `Generate: ${source.name}` : 'Generate a report'}
      description="Decide what the report covers and how it looks; the data is checked and each section rendered before the PDF is made."
      contentWidth={wide ? undefined : 800}
    >
      {data && facets ? (
        <ReportWizard key={`${from ?? template ?? ''}-${run}`} data={data} facets={facets} initial={source && run === 0 ? structuredClone(source) : emptyDraft(data, template)} onRestart={() => setRun((n) => n + 1)} />
      ) : (
        <SkeletonPanels count={1} lines={10} />
      )}
    </PageFrame>
  )
}
