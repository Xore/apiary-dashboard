// The frame of the pages outside the shell: sign-in, its failures, and
// sign-out. There is no session yet, so no navigation either; one card in
// the middle of the page, under the product's mark.
import type { ReactNode } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Icon } from '@astryxdesign/core/Icon'
import { NavIcon } from '@astryxdesign/core/NavIcon'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'

export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--color-background-body)' }}>
      <VStack gap={4} style={{ width: '100%', maxWidth: 440 }}>
        <HStack gap={2} vAlign="center" hAlign="center">
          <NavIcon icon={<Icon icon={ShieldCheckIcon} size="sm" />} />
          <Text type="label">APIARY</Text>
        </HStack>
        <Card padding={6}>
          <VStack gap={4}>
            <Heading level={1}>{title}</Heading>
            {children}
          </VStack>
        </Card>
      </VStack>
    </main>
  )
}

/** A sign-in that failed: what happened, and a way to start again. */
export function AuthProblem({ heading, detail, retryHref }: { heading: string; detail: string; retryHref?: string }) {
  return (
    <AuthFrame title={heading}>
      <Text>{detail}</Text>
      {retryHref && (
        <HStack>
          <Button label="Try signing in again" variant="primary" href={retryHref} />
        </HStack>
      )}
    </AuthFrame>
  )
}
