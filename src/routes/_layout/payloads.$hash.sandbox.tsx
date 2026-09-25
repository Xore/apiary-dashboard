import { Text } from '@astryxdesign/core/Text'
import { createFileRoute } from '@tanstack/react-router'
import { SANDBOX_SECTIONS, SandboxResult } from '#/components/analyzers/SandboxResult'
import type { SandboxSection } from '#/components/analyzers/SandboxResult'
import { sectionOf } from '#/components/ViewTabs'
import { getSandboxRun } from '#/data/queries'

export const Route = createFileRoute('/_layout/payloads/$hash/sandbox')({
  // ?section= picks verdict, behavior, network, file forensics (Windows
  // samples), diagnostics or raw; the top bar lists them under Sandbox.
  validateSearch: (search: Record<string, unknown>): { section?: SandboxSection } => ({
    section: SANDBOX_SECTIONS.some((s) => s.id === search.section) && search.section !== 'verdict' ? (search.section as SandboxSection) : undefined,
  }),
  loader: ({ params }) => getSandboxRun(params.hash),
  component: () => {
    const run = Route.useLoaderData()
    const { section } = Route.useSearch()
    return run ? <SandboxResult run={run} section={sectionOf(SANDBOX_SECTIONS, section) as SandboxSection} /> : <Text type="supporting">This sample has not been detonated. Shell scripts without a dynamic route are static-only.</Text>
  },
})
