// What the configuration puts on every page: the admin banner (until it
// expires, dismissible for the session), maintenance and read-only notices,
// and a footer with the footer text, help link and privacy notice.
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Popover } from '@astryxdesign/core/Popover'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { BookOpenIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import type { ShellConfig } from '#/data/types'

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
    <VStack gap={2} paddingInline={6} paddingBlockStart={3}>
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

/** The shell's standing actions, in the side navigation's icon row: how
 * evidence is handled, the help link, and reporting a problem. Icons, named
 * on hover and for assistive tech; nothing floats over the page. */
export function ShellStandingActions({ config, problemReport }: { config: ShellConfig; problemReport?: ReactNode }) {
  const { presentation: p } = config
  const help = p.helpLinkLabel || 'Help'
  return (
    <>
      {p.privacyNotice && (
        <Popover label="Evidence handling" placement="above" content={<Text>{p.privacyNotice}</Text>}>
          <Button label="Evidence handling" variant="ghost" isIconOnly tooltip="Evidence handling" icon={<Icon icon={ShieldCheckIcon} size="sm" />} />
        </Popover>
      )}
      {p.helpLinkUrl && (
        <Button label={`${help} (opens in a new tab)`} href={p.helpLinkUrl} target="_blank" rel="noopener noreferrer" variant="ghost" isIconOnly tooltip={help} icon={<Icon icon={BookOpenIcon} size="sm" />} />
      )}
      {problemReport}
    </>
  )
}
