import { Button } from '@astryxdesign/core/Button'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Icon } from '@astryxdesign/core/Icon'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { ArrowRightEndOnRectangleIcon, ClockIcon, ExclamationTriangleIcon, LockClosedIcon, SignalSlashIcon } from '@heroicons/react/24/outline'
import { useNavigate, useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import type { ComponentType, SVGProps } from 'react'
import { asApiError } from '#/data/errors'
import type { ApiErrorKind } from '#/data/errors'
import { PageFrame } from './PageFrame'

type Reading = { icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; description: string }

/** What each failure means for the operator, and what to do next. */
const READING: Record<ApiErrorKind | 'unknown', Reading> = {
  unavailable: { icon: SignalSlashIcon, title: 'The backend did not answer', description: 'The data service is unreachable (502). Nothing here is cached, so retrying asks again.' },
  overloaded: { icon: ClockIcon, title: 'The backend is busy', description: 'The request was shed to protect the service (503).' },
  expired: { icon: ArrowRightEndOnRectangleIcon, title: 'Your session expired', description: 'Sign in again to continue; you come back to this page.' },
  locked: { icon: LockClosedIcon, title: 'The dashboard is read-only', description: 'An admin has frozen changes for everyone. Reading still works.' },
  forbidden: { icon: LockClosedIcon, title: 'Not available to your role', description: 'This needs the admin role. Ask an admin, or open a page your role can see.' },
  unknown: { icon: ExclamationTriangleIcon, title: 'This page failed to load', description: 'The request failed. Nothing here is cached, so retrying asks again.' },
}

/** Route error boundary: says why the load failed (never that data is
 * absent) and offers the next step for that kind of failure. */
export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const api = asApiError(error)
  const reading = READING[api?.kind ?? 'unknown']
  if (!api) console.error('Route error:', error)
  // Mock sign-in: signing in again means leaving the expired-session scenario.
  const signIn = () => void navigate({ to: '.', search: (prev: Record<string, unknown>) => ({ ...prev, mock: undefined }) })
  return (
    <PageFrame title={reading.title}>
      <VStack gap={4}>
        <EmptyState
          icon={<Icon icon={reading.icon} size="lg" />}
          title={reading.title}
          description={api?.retryAfter ? `${reading.description} It asked to wait ${api.retryAfter} s before trying again.` : reading.description}
          actions={api?.kind === 'expired' ? <Button label="Sign in again" onClick={signIn} /> : api?.kind === 'forbidden' ? undefined : <Button label="Try again" onClick={() => void router.invalidate()} />}
        />
        {api && <Text type="supporting" color="secondary">{`Failed call: ${api.endpoint} (${api.status})`}</Text>}
        {!api && import.meta.env.DEV && <CodeBlock code={error instanceof Error ? (error.stack ?? error.message) : String(error)} title="Error" maxHeight={240} />}
      </VStack>
    </PageFrame>
  )
}
