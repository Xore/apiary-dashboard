import { SkeletonPanels, ValueList } from '#/components/EntityBlocks'
import { orPending } from '#/lib/pending'
import { Grid } from '@astryxdesign/core/Grid'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/events/$id')

export const Route = createFileRoute('/_layout/events/$id/iocs')({ component: EventIocs, pendingComponent: EventIocs })

/** Every value in this event you can pivot on. */
function EventIocs() {
  const loaded = orPending(parent.useLoaderData())
  if (!loaded) return <SkeletonPanels count={4} lines={3} />
  const event = loaded.event
  const hashes = loaded.hashes
  const opt = (v?: string) => (v ? [v] : [])
  return (
    <Grid columns={{ minWidth: 280, repeat: 'fit' }} gap={4}>
      <ValueList title="Source IP" kind="source" values={[event.srcIp]} />
      <ValueList title="Autonomous system" kind="asn" values={[event.asn]} />
      <ValueList title="Country" kind="country" values={[event.country]} />
      <ValueList title="Username" kind="username" values={opt(event.username)} />
      <ValueList title="Password" kind="password" values={opt(event.password)} />
      <ValueList title="Command" kind="command" values={opt(event.command)} />
      <ValueList title="Hashes" kind="payload" values={hashes} />
    </Grid>
  )
}
