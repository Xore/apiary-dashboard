import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import type { DeadLetter } from '#/data/types'
import { formatDateTime } from '#/lib/format'

/** One document Elasticsearch rejected, with the original body to fix it from. */
export function DeadLetterDetail({ row }: { row: DeadLetter }) {
  return (
    <VStack gap={4}>
      <Text type="code">{row.reason}</Text>
      <MetadataList label={{ position: 'start', width: 80 }}>
        <MetadataListItem label="Time">
          {formatDateTime(row.timestamp)}
        </MetadataListItem>
        <MetadataListItem label="Index">
          <Text type="code">{row.index}</Text>
        </MetadataListItem>
      </MetadataList>
      <CodeBlock
        code={JSON.stringify(row.document, null, 2)}
        language="json"
        title="Original document"
      />
    </VStack>
  )
}
