import { Link } from '@astryxdesign/core/Link'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute } from '@tanstack/react-router'
import { CampaignTimeline, CoverageHeatmap, KillChainFlow } from '#/components/charts'
import { Panel } from '#/components/DashboardBlocks'
import { PageFrame } from '#/components/PageFrame'
import { getKillChain } from '#/data/queries'

export const Route = createFileRoute('/_layout/kill-chain')({
  loader: () => getKillChain(),
  component: KillChainPage,
})

function KillChainPage() {
  const data = Route.useLoaderData()
  return (
    <PageFrame
      title="Kill-chain analytics"
      description="How attackers progress through MITRE ATT&CK tactics. Behavior context only, never actor attribution."
      actions={
        <>
          <Link href="/campaigns">Network campaigns</Link>
          <Link href="/attackers">Attacker identities</Link>
        </>
      }
    >
      <VStack gap={6}>
        <Panel title="Kill-chain flow">
          <Text color="secondary">
            Each attacker session contributes one flow unit between every pair of tactics its traffic touched, in
            kill-chain order.
          </Text>
          <KillChainFlow flow={data.flow} />
        </Panel>
        <Panel title="Campaign timeline" action={<Link href="/campaigns">All campaigns</Link>}>
          <Text color="secondary">Current network campaigns, from first to last observed activity.</Text>
          <CampaignTimeline rows={data.timeline} />
        </Panel>
        <Panel title="ATT&CK coverage">
          <Text color="secondary">
            Every technique this deployment has evidence for, grouped by tactic. Darker cells mean more observed
            events, not more severe activity.
          </Text>
          <CoverageHeatmap tactics={data.tactics} cells={data.coverage} />
        </Panel>
      </VStack>
    </PageFrame>
  )
}
