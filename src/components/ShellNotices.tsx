// What the configuration puts on every page: the admin banner (until it
// expires, dismissible for the session), maintenance and read-only notices,
// and a footer with the footer text, help link and privacy notice.
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Popover } from '@astryxdesign/core/Popover'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import type { ShellConfig } from '#/data/types'
import { ActionLink } from './ActionLink'

const STATUS = { info: 'info', success: 'success', warning: 'warning', danger: 'error' } as const
const DISMISSED_KEY = 'apiary-banner-dismissed'

export function ShellBanners({ config }: { config: ShellConfig }) {
  const { presentation: p, behavior: b } = config
  // Dismissing hides this banner text for the session; a new text shows again.
  const [dismissed, setDismissed] = useState<string | null>(null)
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISSED_KEY))
    } catch {
      /* storage unavailable: the banner stays */
    }
  }, [])
  const expired = p.bannerExpires !== '' && Date.parse(p.bannerExpires) < Date.now()
  const showBanner = p.bannerText !== '' && !expired && dismissed !== p.bannerText
  if (!showBanner && !b.maintenanceMode && !b.readOnly) return null
  return (
    <VStack gap={2} style={{ padding: '12px 24px 0' }}>
      {b.maintenanceMode && <Banner status="warning" title="Maintenance in progress" description="The platform is being worked on. Data can be late or incomplete until this notice is gone." />}
      {b.readOnly && <Banner status="info" title="Read-only" description="An admin has frozen changes for everyone. Everything can be read; nothing can be changed until it is lifted." />}
      {showBanner && (
        <Banner
          status={p.bannerSeverity ? STATUS[p.bannerSeverity] : 'info'}
          title={p.bannerText}
          description={p.bannerExpires ? `Until ${new Date(p.bannerExpires).toUTCString().replace(' GMT', ' UTC')}` : undefined}
          isDismissable
          onDismiss={() => {
            setDismissed(p.bannerText)
            try {
              sessionStorage.setItem(DISMISSED_KEY, p.bannerText)
            } catch {
              /* storage unavailable: dismissed for this page only */
            }
          }}
        />
      )}
    </VStack>
  )
}

/** The shell's standing actions, floating over the content, pinned to the
 * bottom right: how evidence is handled, the help link, and reporting a
 * problem. One group, so they never overlap each other. */
export function ShellFloatingActions({ config, problemReport }: { config: ShellConfig; problemReport?: ReactNode }) {
  const { presentation: p } = config
  if (!p.helpLinkUrl && !p.privacyNotice && !problemReport) return null
  return (
    <HStack gap={2} vAlign="center" style={{ position: 'fixed', insetInlineEnd: 16, insetBlockEnd: 16, zIndex: 20 }}>
      {p.privacyNotice && (
        <Popover label="Evidence handling" placement="above" content={<Text>{p.privacyNotice}</Text>}>
          <Button label="Evidence handling" size="sm" variant="secondary" icon={<Icon icon={ShieldCheckIcon} size="sm" />} />
        </Popover>
      )}
      {p.helpLinkUrl && <ActionLink href={p.helpLinkUrl} external>{p.helpLinkLabel || 'Help'}</ActionLink>}
      {problemReport}
    </HStack>
  )
}
