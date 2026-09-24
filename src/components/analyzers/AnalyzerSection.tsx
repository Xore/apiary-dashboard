import type { ReactNode } from 'react'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Heading, Text } from '@astryxdesign/core/Text'

/** One analyzer's result inside the payload page: a titled block, not a page. */
export function AnalyzerSection({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <VStack gap={4}>
      <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap">
        <VStack gap={1}>
          <Heading level={2}>{title}</Heading>
          {description && <Text color="secondary">{description}</Text>}
        </VStack>
        {actions && <HStack gap={2}>{actions}</HStack>}
      </HStack>
      {children}
    </VStack>
  )
}
