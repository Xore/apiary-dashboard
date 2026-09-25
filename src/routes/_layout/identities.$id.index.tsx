import { Link } from '@astryxdesign/core/Link'
import { attckUrl } from '#/components/DetailBlocks'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { RelatedPanel } from '#/components/Related'
import { getRelated } from '#/data/queries'
import { Panel } from '#/components/DashboardBlocks'
import { GroupOverview } from '#/components/EntityBlocks'

const parent = getRouteApi('/_layout/identities/$id')

export const Route = createFileRoute('/_layout/identities/$id/')({
  loader: ({ params }) => getRelated('identity', params.id),
  component: IdentityOverview,
})


function IdentityOverview() {
  const { identity: a, group } = parent.useLoaderData()
  return (
    <VStack gap={4}>
      <Panel title="Identity">
        <MetadataList label={{ position: 'start', width: 112 }}>
          <MetadataListItem label="Entity id">
            <Text type="code">{a.id}</Text>
          </MetadataListItem>
          {a.scan && (
            <MetadataListItem label="Scan shape">
              {a.scan === 'horizontal' ? `horizontal: ${a.destIps} distinct destinations` : `vertical: ${a.portsTouched} ports across ${a.destIps} hosts`}
            </MetadataListItem>
          )}
        </MetadataList>
        {a.techniques.length > 0 && (
          <HStack gap={1} wrap="wrap">
            {a.techniques.map((t) => (
              <Token key={t} size="sm" color="blue" label={t} href={attckUrl(t)} />
            ))}
          </HStack>
        )}
        {a.ips.length > 0 && <Link href={`/recordings?ip=${encodeURIComponent(a.ips[0])}`}>Session recordings</Link>}
      </Panel>
      <GroupOverview group={group} base={`/identities/${a.id}`} sourcesTab="members" />
      <RelatedPanel center={a.id.slice(0, 8)} groups={Route.useLoaderData()} />
    </VStack>
  )
}
