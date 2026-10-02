import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { HStack } from '@astryxdesign/core/Stack'
import { BellIcon } from '@heroicons/react/24/outline'
import { useLocation } from '@tanstack/react-router'
import { getOpenAlertCount } from '#/data/queries'
import { useLiveInterval } from '#/lib/live'

/** Open alerts, as the canonical bell counts them: every minute while live
 * is on, and after each navigation (acknowledging on /alerts lowers it). */
function useOpenAlertCount(pathname: string): number | null {
  const [count, setCount] = useState<number | null>(null)
  const refresh = useCallback(() => {
    getOpenAlertCount().then(setCount, () => setCount(null))
  }, [])
  useLiveInterval(refresh, 60_000)
  useEffect(refresh, [refresh, pathname])
  return count
}

/** The top bar's bell: the open-alert count, and the way to Alerts. */
/** Compact: the drawer layout, sized for touch. */
export function AlertBell({ compact = false }: { compact?: boolean }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const open = useOpenAlertCount(pathname)
  const label = open ? `Alerts, ${open} open` : 'Alerts'
  return (
    <Button label={label} tooltip={label} variant="secondary" size={compact ? 'lg' : 'sm'} href="/alerts" isIconOnly={!open} icon={open ? undefined : <Icon icon={BellIcon} size="sm" />}>
      {open ? (
        <HStack gap={1.5} vAlign="center">
          <Icon icon={BellIcon} size="sm" />
          <Badge variant="warning" label={open > 99 ? '99+' : open} />
        </HStack>
      ) : undefined}
    </Button>
  )
}
