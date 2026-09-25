// What the configuration puts on every page: the admin banner (until it
// expires, dismissible for the session), maintenance and read-only notices,
// and a footer with the footer text, help link and privacy notice.
import { useEffect, useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Link } from '@astryxdesign/core/Link'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
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

export function ShellFooter({ config }: { config: ShellConfig }) {
  const { presentation: p } = config
  if (!p.footerText && !p.helpLinkUrl && !p.privacyNotice) return null
  return (
    <HStack gap={3} vAlign="center" wrap="wrap" style={{ padding: '6px 24px', borderTop: '1px solid var(--color-border)' }}>
      {p.footerText && <Text type="supporting">{p.footerText}</Text>}
      <StackItem size="fill" />
      {p.privacyNotice && (
        <span title={p.privacyNotice}>
          <Text type="supporting">Evidence handling</Text>
        </span>
      )}
      {p.helpLinkUrl && (
        <Link href={p.helpLinkUrl} target="_blank" rel="noopener noreferrer">
          {p.helpLinkLabel || 'Help'}
        </Link>
      )}
    </HStack>
  )
}
