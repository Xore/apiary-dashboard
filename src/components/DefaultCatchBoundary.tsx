import { Button } from '@astryxdesign/core/Button'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Icon } from '@astryxdesign/core/Icon'
import { VStack } from '@astryxdesign/core/Stack'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { PageFrame } from './PageFrame'

/** Route error boundary: says the load failed (never that data is absent)
 * and offers a retry. */
export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  console.error('Route error:', error)
  return (
    <PageFrame title="Something went wrong">
      <VStack gap={4}>
        <EmptyState
          icon={<Icon icon={ExclamationTriangleIcon} size="lg" />}
          title="This page failed to load"
          description="The request failed. Nothing here is cached, so retrying asks again."
          actions={<Button label="Try again" onClick={() => void router.invalidate()} />}
        />
        {import.meta.env.DEV && <CodeBlock code={error instanceof Error ? (error.stack ?? error.message) : String(error)} title="Error" maxHeight={240} />}
      </VStack>
    </PageFrame>
  )
}
