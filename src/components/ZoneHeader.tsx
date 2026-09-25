import { zoneLabel } from '#/lib/format'

/** A time column's header, naming the zone the times are shown in. */
export function ZoneHeader({ label }: { label: string }) {
  return <>{`${label} (${zoneLabel()})`}</>
}
