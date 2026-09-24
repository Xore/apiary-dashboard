import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { EvidenceLink } from '#/components/details/LlmAnalysis'
import { EntityFrame } from '#/components/EntityFrame'
import { entityTabs } from '#/components/ViewTabs'
import type { ViewTab } from '#/components/ViewTabs'
import { NotFound } from '#/components/NotFound'
import { SeverityToken } from '#/components/SeverityToken'
import { getLlmAnalysis } from '#/data/queries'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/llm-analysis/$id')({
  staticData: { viewTabs: entityTabs({ label: 'LLM analysis views', basePath: (params) => `/llm-analysis/${encodeURIComponent(params.id)}`, tabs: tabsFor }) },
  loader: async ({ params }) => {
    const detail = await getLlmAnalysis(params.id)
    if (!detail) throw notFound()
    return detail
  },
  notFoundComponent: () => (
    <NotFound title="LLM analysis" description="No analysis has this id." />
  ),
  component: LlmLayout,
})

function LlmLayout() {
  const { analysis: a } = Route.useLoaderData()
  return (
    <EntityFrame
      kind={`LLM analysis · ${a.docType}`}
      title={a.intent}
      basePath={`/llm-analysis/${encodeURIComponent(a.id)}`}
      tokens={
        <>
          <SeverityToken severity={a.severity} />
          <Token label="AI-generated" size="sm" />
        </>
      }
      facts={[
        { label: 'Analyzed', value: formatDateTime(a.timestamp) },
        { label: 'Confidence', value: a.confidence ?? '—' },
        { label: 'Evidence', value: <EvidenceLink row={a} /> },
        { label: 'Model', value: a.model },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}

/** The top-bar tabs: static until the loader data arrives, then with counts. */
function tabsFor(loaded: unknown): ViewTab[] {
  if (!loaded) return [{ id: 'summary', label: 'Summary' }, { id: 'evidence', label: 'Evidence' }, { id: 'behaviors', label: 'Behaviors' }, { id: 'raw', label: 'Raw' }]
  const data = loaded as ReturnType<typeof Route.useLoaderData>
  const { analysis: a, events } = data
  return [
    { id: 'summary', label: 'Summary' },
    { id: 'evidence', label: 'Evidence', count: events.length },
    { id: 'behaviors', label: 'Behaviors', count: a.behaviors.length },
    { id: 'raw', label: 'Raw' },
  ]
}
