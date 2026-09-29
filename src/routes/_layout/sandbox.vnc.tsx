import { pageSsr } from '#/lib/pageSsr'
import { ActionLink } from '#/components/ActionLink'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Icon } from '@astryxdesign/core/Icon'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { createFileRoute } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { PageFrame } from '#/components/PageFrame'
import { SkeletonLines } from '#/components/EntityBlocks'
import { orPending } from '#/lib/pending'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { getSandboxLiveStatus } from '#/data/queries'
import { formatDateTime } from '#/lib/format'
import { analysisTabs } from '#/lib/navFamilies'

export const Route = createFileRoute('/_layout/sandbox/vnc')({
  ssr: pageSsr,
  staticData: { viewTabs: analysisTabs() },
  loader: () => getSandboxLiveStatus(),
  component: SandboxLivePage,
  pendingComponent: SandboxLivePage,
})

function SandboxLivePage() {
  const status = orPending(Route.useLoaderData())
  return (
    <PageFrame title="Sandbox live view" description="A read-only view of the isolated Windows guest while a captured sample detonates. Admin only.">
      <VStack gap={4}>
        {!status ? (
          <Panel title={<Skeleton width={200} height={18} />}>
            <SkeletonLines count={2} />
          </Panel>
        ) : status.running ? (
          <Panel title={`Detonating ${status.job ?? ''}`}>
            <Text>Started {status.since ? formatDateTime(status.since) : 'just now'}. The guest display appears here, view only.</Text>
          </Panel>
        ) : (
          <EmptyState
            icon={<Icon icon={ComputerDesktopIcon} size="lg" />}
            title="No detonation is running"
            description="The view opens automatically when the Windows sandbox starts a sample."
            actions={<ActionLink href="/payload-workbench/results?tab=sandbox">Sandbox results</ActionLink>}
          />
        )}
        <Text type="supporting">This page never controls the guest. Keyboard and mouse input are not forwarded.</Text>
      </VStack>
    </PageFrame>
  )
}
