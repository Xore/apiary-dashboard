import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { pixel, proportional } from '@astryxdesign/core/Table'
import { clusterHref } from '#/lib/entities'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { createFileRoute } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { getInfraClusters } from '#/data/queries'
import type { InfraCluster } from '#/data/types'
import { downloadCsv } from '#/lib/export'
import { formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/clusters/')({
  loader: () => getInfraClusters(),
  component: ClustersPage,
})

const rowHref = (row: InfraCluster) => clusterHref(row.kind, row.value)

const columns: TableColumn<InfraCluster>[] = [
  { key: 'kind', header: 'Cluster type', width: pixel(120), renderCell: (row) => <Token label={row.kind} size="sm" /> },
  {
    key: 'value',
    header: 'Shared value',
    width: proportional(3),
    renderCell: (row) => (
      <Link href={rowHref(row)}>
        <Text type="code">{row.value}</Text>
      </Link>
    ),
  },
  { key: 'sources', header: 'Source IPs', width: pixel(96), align: 'end' },
  { key: 'events', header: 'Events', width: pixel(88), align: 'end', renderCell: (row) => formatNumber(row.events) },
  { key: 'sensors', header: 'Sensors', width: pixel(96), align: 'end', renderCell: (row) => row.sensors.length },
]


function ClustersPage() {
  const clusters = Route.useLoaderData()
  return (
    <RecordList
      title="Infrastructure clusters"
      description="Fingerprints, payloads, autonomous systems, and providers shared by multiple source IPs."
      actions={
        <>
          <Text type="supporting">{clusters.length} shared pivots</Text>
          <Button
            label="CSV"
            size="sm"
            variant="secondary"
            icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
            onClick={() => downloadCsv('clusters.csv', clusters, ['kind', 'value', 'sources', 'events', 'sensors'])}
          />
        </>
      }
      rows={clusters}
      columns={columns}
      getHref={rowHref}
      getId={(row) => row.id}
      emptyState={{
        title: 'No shared pivots in the current window',
        description: 'Clusters appear once two or more source IPs share a strong signal.',
      }}
    />
  )
}
