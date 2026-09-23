import { Card } from '@astryxdesign/core/Card'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { createFileRoute } from '@tanstack/react-router'

const GHOST_MESSAGES = [
  { role: 'assistant', width: '78%', height: 104 },
  { role: 'user', width: '48%', height: 48 },
  { role: 'assistant', width: '64%', height: 132 },
  { role: 'user', width: '38%', height: 40 },
] as const

export const Route = createFileRoute('/_layout/')({
  component: IndexPage,
})

function IndexPage() {
  return (
    <Layout
      height="fill"
      contentWidth={768}
      content={
        <LayoutContent padding={6}>
          <VStack gap={5}>
            {GHOST_MESSAGES.map((message, index) => (
              <HStack
                key={index}
                hAlign={message.role === 'assistant' ? 'start' : 'end'}
              >
                <Card
                  variant="muted"
                  padding={0}
                  width={message.width}
                  height={message.height}
                />
              </HStack>
            ))}
          </VStack>
        </LayoutContent>
      }
    />
  )
}
