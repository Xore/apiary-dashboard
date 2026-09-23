import type { ReactNode } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { HStack } from '@astryxdesign/core/Stack'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { PageFrame } from './PageFrame'

type NotFoundProps = {
  title?: string
  description?: ReactNode
}

/** Shown for unknown routes and for detail pages whose record does not
 * exist (aged out of the index, mistyped id). */
export function NotFound({ title = 'Page not found', description = 'Nothing lives at this address.' }: NotFoundProps) {
  return (
    <PageFrame title={title}>
      <EmptyState
        icon={<Icon icon={QuestionMarkCircleIcon} size="lg" />}
        title="Nothing to show"
        description={typeof description === 'string' ? description : undefined}
        actions={
          <HStack gap={3} vAlign="center">
            <Button label="Go back" variant="secondary" onClick={() => window.history.back()} />
            <Link href="/">Overview</Link>
          </HStack>
        }
      />
    </PageFrame>
  )
}
