import { ActionLink } from '#/components/ActionLink'
import { Banner } from '@astryxdesign/core/Banner'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { Panel } from '../DashboardBlocks'
import type { RevDeckRun } from '#/data/types'
import { AnalyzerSection } from './AnalyzerSection'

import { formatDateTime } from '#/lib/format'
import { EntityLink } from '../EntityLink'
import { AiGenerated } from '../AiGenerated'
import { RevDeckConversation } from './RevDeckConversation'

export function RevDeckResult({ run }: { run: RevDeckRun }) {
  return (
    <AnalyzerSection
      title="RevDeck result"
      description="One binary's reverse-engineering walkthrough: a bounded, tool-calling model loop against the Ghidra service."
      actions={<Token size="sm" color={run.status === 'completed' ? 'green' : 'red'} label={run.status} />}
    >
      <VStack gap={5}>
        <HStack gap={3} wrap="wrap">
          <EntityLink kind="payload" id={run.sha}><Text type="code">{`${run.sha.slice(0, 24)}…`}</Text></EntityLink>
          <ActionLink href={`/ghidra/${run.sha}`}>Ghidra result</ActionLink>
          <Text type="supporting">{`${formatDateTime(run.at)} · workflow ${run.workflow} · ${run.steps.length} tool calls`}</Text>
        </HStack>
        {run.status === 'failed' ? (
          <Banner status="error" title="This run did not complete" description={run.error} />
        ) : (
          <Panel title="Workflow verdict" action={<AiGenerated />}>
            <Text weight="semibold">{run.verdict}</Text>
            <Text>{run.summary}</Text>
          </Panel>
        )}
        <Panel title="Conversation" action={<Text type="supporting">{`${run.transcript.length} messages · ${run.transcript.reduce((n, m) => n + (m.toolCalls?.length ?? 0), 0)} tool calls`}</Text>}>
          <RevDeckConversation run={run} />
        </Panel>
        {run.status !== 'failed' && (
          <Panel title="Citations">
            <HStack gap={1} wrap="wrap">
              {run.citations.valid.map((c) => <Token key={c} size="sm" color="green" label={c} />)}
            </HStack>
            {run.citations.invalid.length > 0 && (
              <VStack gap={1}>
                <Text type="supporting">Cited by the model but not found in the analysis:</Text>
                <HStack gap={1} wrap="wrap">
                  {run.citations.invalid.map((c) => <Token key={c} size="sm" color="red" label={c} />)}
                </HStack>
              </VStack>
            )}
          </Panel>
        )}
        <Panel title="Raw record">
          <CodeBlock code={JSON.stringify(run, null, 2)} language="json" maxHeight={360} />
        </Panel>
      </VStack>
    </AnalyzerSection>
  )
}
