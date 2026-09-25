import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/Stack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'
import { toggleLive, useLiveEvents, useLiveState } from '#/lib/live'
import { usePreferences } from '#/lib/prefs'

const ignore = () => {}

/** The one live indicator: live, paused, or stalled. Clicking pauses or
 * resumes every refresh path at once. */
export function LiveBadge() {
  // The shell holds the one connection, so the badge tells the truth on
  // every page, including one whose own load failed.
  useLiveEvents(ignore)
  const prefs = usePreferences()
  const { paused, connectionHealthy } = useLiveState(prefs?.autoRefresh)
  const [variant, label, tooltip] = paused
    ? (['neutral', 'Paused', 'Live updates are paused. Click to resume.'] as const)
    : connectionHealthy
      ? (['success', 'Live', 'New events arrive as they happen. Click to pause.'] as const)
      : (['error', 'Stalled', 'The live stream is not connected. Pages still load; nothing new arrives.'] as const)
  return (
    <Button label={label} variant="ghost" size="sm" tooltip={tooltip} onClick={toggleLive}>
      <HStack gap={1.5} vAlign="center">
        <StatusDot variant={variant} label={label} isPulsing={variant === 'success'} />
        <Text type="supporting">{label}</Text>
      </HStack>
    </Button>
  )
}
