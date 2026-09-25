import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { VERDICT_COLOR } from '#/components/analyzers/PayloadBlocks'
import { EntityFrame } from '#/components/EntityFrame'
import { entityTabs } from '#/components/ViewTabs'
import type { ViewTab } from '#/components/ViewTabs'
import { NotFound } from '#/components/NotFound'
import { getCapeRun, getGithubAnalysis, getPayloadAnalysis, getPayloadDelivery, getRevDeckRun } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'
import { GHIDRA_SECTIONS } from '#/components/analyzers/GhidraResult'

export const Route = createFileRoute('/_layout/payloads/$hash')({
  staticData: { viewTabs: entityTabs({ label: 'Payload views', basePath: (params) => `/payloads/${params.hash}`, tabs: tabsFor }) },
  loader: async ({ params }) => {
    const [analysis, cape, revdeck, github, delivery] = await Promise.all([
      getPayloadAnalysis(params.hash),
      getCapeRun(params.hash),
      getRevDeckRun(params.hash),
      getGithubAnalysis(params.hash),
      getPayloadDelivery(params.hash),
    ])
    if (!analysis) throw notFound()
    return { analysis, cape, revdeck, github, delivery }
  },
  notFoundComponent: () => <NotFound title="Payload" description="No captured payload has this hash." />,
  component: PayloadLayout,
})

/** One captured file and every analysis of it, in one place (epic #25). */
function PayloadLayout() {
  const { analysis: a, delivery } = Route.useLoaderData()
  const p = a.payload

  return (
    <EntityFrame
      kind="Payload"
      title={`${p.hash.slice(0, 16)}…`}
      description={`${a.fileType} · ${p.platform}`}
      basePath={`/payloads/${p.hash}`}
      tokens={
        <>
          {p.verdict && <Token size="sm" color={VERDICT_COLOR[p.verdict.label]} label={p.verdict.label} />}
          {p.verdict?.family && <Token size="sm" color="purple" label={p.verdict.family} />}
          {p.sources.map((s) => (
            <Token key={s} size="sm" label={s} />
          ))}
        </>
      }
      facts={[
        { label: 'Size', value: `${formatNumber(p.sizeBytes)} bytes` },
        { label: 'First captured', value: formatDateTime(p.capturedAt) },
        { label: 'Copies', value: formatNumber(p.copies) },
        { label: 'Static risk', value: `${a.staticRisk} / 100` },
        { label: 'Delivered by', value: `${formatNumber(delivery.sources.length)} addresses` },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}

/** The top-bar tabs: static until the loader data arrives, then with counts. */
function tabsFor(loaded: unknown): ViewTab[] {
  if (!loaded) return [{ id: 'overview', label: 'Overview' }, { id: 'static', label: 'Static' }, { id: 'indicators', label: 'Indicators' }, { id: 'sandbox', label: 'Sandbox' }, { id: 'ghidra', label: 'Ghidra', sections: GHIDRA_SECTIONS }, { id: 'cape', label: 'CAPE' }, { id: 'revdeck', label: 'RevDeck' }, { id: 'github', label: 'GitHub' }, { id: 'delivered-by', label: 'Delivered by' }, { id: 'sessions', label: 'Sessions' }, { id: 'timeline', label: 'Timeline' }]
  const data = loaded as ReturnType<typeof Route.useLoaderData>
  const { analysis: a, delivery } = data
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'static', label: 'Static' },
    { id: 'indicators', label: 'Indicators', count: a.iocs.length + a.yara.length },
    { id: 'sandbox', label: 'Sandbox' },
    { id: 'ghidra', label: 'Ghidra', sections: GHIDRA_SECTIONS },
    { id: 'cape', label: 'CAPE' },
    { id: 'revdeck', label: 'RevDeck' },
    { id: 'github', label: 'GitHub' },
    { id: 'delivered-by', label: 'Delivered by', count: delivery.sources.length },
    { id: 'sessions', label: 'Sessions', count: delivery.sessions.length },
    { id: 'timeline', label: 'Timeline' },
  ]
}
