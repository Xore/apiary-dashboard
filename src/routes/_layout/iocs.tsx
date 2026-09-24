import { useState } from 'react'
import { Link } from '@astryxdesign/core/Link'
import { HStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { createFileRoute } from '@tanstack/react-router'
import { IocLookup } from '#/components/IocLookup'
import { RecordList } from '#/components/RecordList'
import { searchTabs } from '#/components/ViewTabs'
import { getIocCatalog, getNetworkCampaigns, getSourceProfiles } from '#/data/queries'
import type { IocHubKind, IocRow } from '#/data/types'
import { iocHref } from '#/lib/entities'
import { formatNumber, formatTime } from '#/lib/format'

const KINDS: Array<{ id: IocHubKind; label: string; lede: string }> = [
  { id: 'hash', label: 'Hashes', lede: 'Payloads captured from download events.' },
  { id: 'domain', label: 'Domains', lede: 'Hosts named in downloader commands.' },
  { id: 'url', label: 'URLs', lede: 'Fetch URLs from executed commands and paths requested from web sensors.' },
  { id: 'credential', label: 'Credentials', lede: 'Username and password pairs tried.' },
  { id: 'command', label: 'Commands', lede: 'Shell commands attackers ran.' },
  { id: 'fingerprint', label: 'Fingerprints', lede: 'Client fingerprints (HASSH and the like) that join addresses.' },
  { id: 'cve', label: 'CVEs', lede: 'Vulnerabilities named by IDS signatures and exploit paths.' },
  { id: 'signature', label: 'Signatures', lede: 'IDS signatures that fired.' },
]
const isKind = (value: unknown): value is IocHubKind => KINDS.some((k) => k.id === value)

export const Route = createFileRoute('/_layout/iocs')({
  staticData: { viewTabs: searchTabs({ label: 'Indicator kinds', param: 'kind', tabs: (loaded) => KINDS.map((k) => ({ id: k.id, label: k.label, count: (loaded as { catalog?: Record<string, unknown[]> } | undefined)?.catalog?.[k.id].length })) }) },
  validateSearch: (search: Record<string, unknown>): { kind?: IocHubKind } => ({
    kind: isKind(search.kind) && search.kind !== 'hash' ? search.kind : undefined,
  }),
  loader: async () => {
    const [catalog, { sources }, { campaigns }] = await Promise.all([getIocCatalog(), getSourceProfiles(), getNetworkCampaigns()])
    return { catalog, examples: [sources[0]?.ip, campaigns[0]?.cidr, catalog.hash[0]?.value, catalog.cve[0]?.value, catalog.credential[0]?.value].filter((v): v is string => Boolean(v)) }
  },
  component: IocsPage,
})

const columns: TableColumn<IocRow>[] = [
  { key: 'value', header: 'Indicator', width: proportional(4), renderCell: (row) => <Text type="code" maxLines={1}>{row.value}</Text> },
  { key: 'events', header: 'Events', width: pixel(88), align: 'end', renderCell: (row) => formatNumber(row.events) },
  { key: 'sources', header: 'Sources', width: pixel(88), align: 'end', renderCell: (row) => formatNumber(row.sources) },
  { key: 'sessions', header: 'Sessions', width: pixel(88), align: 'end', renderCell: (row) => formatNumber(row.sessions) },
  { key: 'last', header: 'Last seen', width: pixel(104), renderCell: (row) => <Text type="supporting">{row.last ? formatTime(row.last) : '—'}</Text> },
]

/** Every indicator in one place, by kind; each opens its own page. */
function IocsPage() {
  const { catalog, examples } = Route.useLoaderData()
  const { kind = 'hash' } = Route.useSearch()
  const [filter, setFilter] = useState('')
  const current = KINDS.find((k) => k.id === kind)!
  const needle = filter.trim().toLowerCase()
  const rows = catalog[kind].filter((row) => !needle || row.value.toLowerCase().includes(needle))

  return (
    <RecordList
      title="Indicators"
      description="Hashes, domains, URLs, credentials, commands, fingerprints, CVEs and signatures seen across the fleet. Paste any value to jump to its page."
      summary={<IocLookup examples={examples} />}
      toolbar={
        <HStack gap={3} vAlign="center" wrap="wrap">
          <TextInput label={`Filter ${current.label.toLowerCase()}`} isLabelHidden size="sm" width={320} placeholder={`Filter ${current.label.toLowerCase()}`} value={filter} onChange={setFilter} />
          <Text type="supporting">{current.lede}</Text>
          {kind === 'command' && <Link href="/commands">Every execution</Link>}
        </HStack>
      }
      rows={rows}
      columns={columns}
      getId={(row) => row.id}
      getHref={(row) => iocHref(row.kind, row.value)}
      emptyState={{ title: `No ${current.label.toLowerCase()} seen`, description: 'Nothing of this kind has been captured yet.' }}
    />
  )
}
