import type { ReactNode } from 'react'
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Heading, Text } from '@astryxdesign/core/Text'

type PageFrameProps = {
  title: string
  description?: string
  actions?: ReactNode
  /** Caps the readable width, e.g. 800 for a single-column form. */
  contentWidth?: number
  children: ReactNode
}

/** Standard page frame: pinned title row over a scrolling, full-width body. */
export function PageFrame({ title, description, actions, contentWidth, children }: PageFrameProps) {
  return (
    <Layout
      height="fill"
      padding={6}
      contentWidth={contentWidth}
      header={
        <LayoutHeader>
          <HStack hAlign="between" vAlign="center" gap={4}>
            <VStack gap={1}>
              <Heading level={1}>{title}</Heading>
              {description && <Text color="secondary">{description}</Text>}
            </VStack>
            {actions && <HStack gap={2}>{actions}</HStack>}
          </HStack>
        </LayoutHeader>
      }
      content={<LayoutContent>{children}</LayoutContent>}
    />
  )
}
