// A RevDeck run as the conversation it was: the workflow's system prompt,
// the dashboard's request, and the model's turns with the tool calls each
// made, read-only. Laid out as Astryx's ai-chat template lays out a chat.
import { Avatar } from '@astryxdesign/core/Avatar'
import { ChatMessage, ChatMessageBubble, ChatMessageList, ChatMessageMetadata, ChatSystemMessage, ChatToolCalls } from '@astryxdesign/core/Chat'
import type { ChatToolCallItem } from '@astryxdesign/core/Chat'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Markdown } from '@astryxdesign/core/Markdown'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import type { RevDeckMessage, RevDeckRun } from '#/data/types'
import { formatClock, formatDateTime } from '#/lib/format'

const duration = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`)

function toolCalls(calls: NonNullable<RevDeckMessage['toolCalls']>): ChatToolCallItem[] {
  return calls.map((call) => ({
    name: call.tool,
    target: call.input === '{}' ? undefined : call.input,
    status: call.error ? 'error' : 'complete',
    duration: duration(call.durationMs),
    errorMessage: call.error,
    resultDetail: call.output ? <CodeBlock code={call.output} maxHeight={240} /> : undefined,
  }))
}

export function RevDeckConversation({ run }: { run: RevDeckRun }) {
  const system = run.transcript.find((m) => m.role === 'system')
  const turns = run.transcript.filter((m) => m.role !== 'system')
  return (
    <ChatMessageList density="compact">
      <ChatSystemMessage variant="divider">{formatDateTime(run.transcript.at(0)?.at ?? run.at)}</ChatSystemMessage>
      {system && (
        <ChatSystemMessage>
          <VStack gap={1}>
            <Text type="supporting" weight="semibold">{`System prompt · ${run.workflow}`}</Text>
            <Text type="supporting">{system.text}</Text>
          </VStack>
        </ChatSystemMessage>
      )}
      {turns.map((message, i) =>
        message.role === 'user' ? (
          <ChatMessage key={i} sender="user">
            <ChatMessageBubble metadata={<ChatMessageMetadata timestamp={formatClock(message.at)} footer={<Text type="supporting">Dashboard</Text>} />}>
              <Markdown density="compact">{message.text}</Markdown>
            </ChatMessageBubble>
          </ChatMessage>
        ) : (
          <ChatMessage key={i} sender="assistant" avatar={<Avatar name="RevDeck" size="md" />}>
            {message.text && (
              <ChatMessageBubble variant="ghost">
                <Markdown density="compact">{message.text}</Markdown>
              </ChatMessageBubble>
            )}
            {message.toolCalls && <ChatToolCalls calls={toolCalls(message.toolCalls)} defaultIsExpanded={message.toolCalls.some((c) => c.error)} />}
            <ChatMessageMetadata timestamp={formatClock(message.at)} />
          </ChatMessage>
        ),
      )}
      {run.status === 'failed' && <ChatSystemMessage>{`The run stopped: ${run.error ?? 'no reason recorded'}.`}</ChatSystemMessage>}
    </ChatMessageList>
  )
}
