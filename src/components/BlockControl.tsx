import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { useRouter } from '@tanstack/react-router'
import { setIpBlocked } from '#/data/queries'

/** Add or remove an address on the portbridge manual blackhole list. */
export function BlockControl({ ip, blocked }: { ip: string; blocked: boolean }) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <Button label={blocked ? 'Unblock' : 'Block at portbridge'} size="sm" variant={blocked ? 'secondary' : 'destructive'} onClick={() => setConfirmOpen(true)} />
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
          try {
            await setIpBlocked(ip, !blocked)
            await router.invalidate()
          } finally {
            setBusy(false)
            setConfirmOpen(false)
          }
        }}
      />
    </>
  )
}
