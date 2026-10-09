import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Icon } from '@astryxdesign/core/Icon'
import { SignalSlashIcon } from '@heroicons/react/24/outline'

/** A panel whose data the backend does not serve yet. Names what is missing,
 * so the panel is never mistaken for an empty result. */
export function PanelBackendGap({ detail }: { detail: string }) {
  return <EmptyState icon={<Icon icon={SignalSlashIcon} size="lg" />} title="Not available from the backend yet" description={detail} />
}
