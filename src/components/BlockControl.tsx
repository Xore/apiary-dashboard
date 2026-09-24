import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { FieldStatus } from '@astryxdesign/core/FieldStatus'
import { HStack } from '@astryxdesign/core/Stack'
import { useRouter } from '@tanstack/react-router'
import { setIpBlocked } from '#/data/queries'
import { describeError } from '#/lib/actionError'
import { ADMIN_REQUIRED, useIsAdmin } from '#/lib/session'

/** Add or remove an address on the portbridge manual blackhole list. */
export function BlockControl({ ip, blocked }: { ip: string; blocked: boolean }) {
  const router = useRouter()
  const isAdmin = useIsAdmin()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  return (
    <HStack gap={2} vAlign="center">
      <Button
        label={blocked ? 'Unblock' : 'Block at portbridge'}
        size="sm"
        variant={blocked ? 'secondary' : 'destructive'}
        isDisabled={!isAdmin}
        tooltip={isAdmin ? undefined : ADMIN_REQUIRED}
        onClick={() => setConfirmOpen(true)}
      />
      {error && <FieldStatus type="error" variant="detached" message={error} />}
      <AlertDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={blocked ? `Unblock ${ip}?` : `Block ${ip}?`}
        description={
          blocked
            ? 'Removes the address from the manual blackhole list. New connections reach the sensors again.'
            : 'Drops new connections from this address at portbridge. Nothing already logged is affected.'
        }
        actionLabel={blocked ? 'Unblock' : 'Block'}
        actionVariant={blocked ? 'primary' : 'destructive'}
        isActionLoading={busy}
        onAction={async () => {
          setBusy(true)
          setError(undefined)
          try {
            await setIpBlocked(ip, !blocked)
            await router.invalidate()
          } catch (e) {
            setError(describeError(e))
          } finally {
            setBusy(false)
            setConfirmOpen(false)
          }
        }}
      />
    </HStack>
  )
}
