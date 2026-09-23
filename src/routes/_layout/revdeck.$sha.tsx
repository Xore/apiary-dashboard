import { Banner } from '@astryxdesign/core/Banner'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Link } from '@astryxdesign/core/Link'
import { List, ListItem } from '@astryxdesign/core/List'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { NotFound } from '#/components/NotFound'
import { PageFrame } from '#/components/PageFrame'
import { getRevDeckRun } from '#/data/queries'
import { formatDateTime } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'

export const Route = createFileRoute('/_layout/revdeck/$sha')({
  loader: async ({ params }) => {
    const run = await getRevDeckRun(params.sha)
    if (!run) throw notFound()
    return run
  },
  notFoundComponent: () => <NotFound title="RevDeck result" description="No RevDeck analysis found for this hash." />,
  component: RevDeckPage,
})

function RevDeckPage() {
  const run = Route.useLoaderData()
  return (
    <PageFrame
      title="RevDeck result"
      description="One binary's reverse-engineering walkthrough: a bounded, tool-calling model loop against the Ghidra service."
      actions={<Token size="sm" color={run.status === 'completed' ? 'green' : 'red'} label={run.status} />}
    >
      <VStack gap={5}>
        <HStack gap={3} wrap="wrap">
          <EntityLink kind="payload" id={run.sha}><Text type="code">{`${run.sha.slice(0, 24)}…`}</Text></EntityLink>
          <Link href={`/ghidra/${run.sha}`}>Ghidra result</Link>
          <Text type="supporting">{formatDateTime(run.at)}</Text>
        </HStack>
        {run.status === 'failed' ? (
          <Banner status="error" title="This run did not complete" description={run.error} />
        ) : (
          <>
            <Panel title="Workflow verdict" action={<Token size="sm" label="AI-generated" />}>
              <Text weight="semibold">{run.verdict}</Text>
              <Text>{run.summary}</Text>
            </Panel>
            <Panel title="Tool-call trace">
              <List density="compact" hasDividers>
                {run.steps.map((step, i) => (
                  <ListItem key={i} label={`${i + 1}. ${step.tool} ${step.input}`} description={step.output} />
                ))}
              </List>
            </Panel>
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
          </>
        )}
        <Panel title="Raw record">
          <CodeBlock code={JSON.stringify(run, null, 2)} language="json" maxHeight={360} />
        </Panel>
      </VStack>
    </PageFrame>
  )
}
