import { Token } from '@astryxdesign/core/Token'
import { Tooltip } from '@astryxdesign/core/Tooltip'

/** An event whose request claimed another source (X-Forwarded-For) than
 * the connection it arrived on: shown beside the connection's address,
 * never instead of it. */
export function ClaimedSource({ claimed }: { claimed: string }) {
  return (
    <Tooltip content={`This request also claimed to come from ${claimed}, which disagrees with the address portbridge recorded for the connection. The connection is the stronger evidence, so it is the one shown; the claim is likely forged.`} focusTrigger="always">
      <Token size="sm" color="orange" label={`claims ${claimed}`} />
    </Tooltip>
  )
}
