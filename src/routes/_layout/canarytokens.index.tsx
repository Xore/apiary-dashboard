import { useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Link } from '@astryxdesign/core/Link'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { searchTabs } from '#/components/ViewTabs'
import { CanaryTokenDialog } from '#/components/dialogs/CanaryTokenDialog'
import { RecordList } from '#/components/RecordList'
import { getCanarytokens } from '#/data/queries'
import type { CanaryToken, CanaryTrigger } from '#/data/types'
import { formatDateTime, formatTime } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'
import { ADMIN_REQUIRED, useIsAdmin } from '#/lib/session'

type View = 'deployed' | 'fired'

export const Route = createFileRoute('/_layout/canarytokens/')({
  staticData: { viewTabs: searchTabs({ label: 'Canarytoken views', param: 'view', tabs: (loaded) => { const d = loaded as { tokens: unknown[]; triggers: unknown[] } | undefined; return [{ id: 'deployed', label: 'Deployed', count: d?.tokens.length }, { id: 'fired', label: 'Fired', count: d?.triggers.length }] } }) },
  validateSearch: (search: Record<string, unknown>): { view?: View } => ({
    view: search.view === 'fired' ? 'fired' : undefined,
  }),
  loader: () => getCanarytokens(),
  component: CanarytokensPage,
})

const tokenColumns: TableColumn<CanaryToken>[] = [
  { key: 'createdAt', header: 'Created', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.createdAt)}</Text> },
  { key: 'type', header: 'Type', width: pixel(120), renderCell: (row) => <Token size="sm" label={row.type} /> },
  { key: 'memo', header: 'Memo', width: proportional(3), renderCell: (row) => row.memo || <Text type="supporting">(no memo)</Text> },
  {
    key: 'url',
    header: 'Token URL',
    width: proportional(2),
    renderCell: (row) => (
      <Text type="code" maxLines={1}>
        {row.url}
      </Text>
    ),
  },
]

const triggerColumns: TableColumn<CanaryTrigger>[] = [
  { key: 'triggeredAt', header: 'Fired', width: pixel(112), renderCell: (row) => <Text type="supporting">{formatTime(row.triggeredAt)}</Text> },
  { key: 'type', header: 'Type', width: pixel(120), renderCell: (row) => <Token size="sm" color="red" label={row.type} /> },
  { key: 'memo', header: 'Token', width: proportional(3) },
  { key: 'srcIp', header: 'Source', width: pixel(136), renderCell: (row) => <EntityLink kind="source" id={row.srcIp} /> },
  { key: 'location', header: 'Location', width: pixel(144) },
]

function CanarytokensPage() {
  const isAdmin = useIsAdmin()
  const { types, tokens, triggers } = Route.useLoaderData()
  const { view = 'deployed' } = Route.useSearch()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [minted, setMinted] = useState<CanaryToken | null>(null)
  const create = (
    <>
      <Button label="Create token" size="sm" isDisabled={!isAdmin} tooltip={isAdmin ? undefined : ADMIN_REQUIRED} onClick={() => setCreating(true)} />
      <CanaryTokenDialog
        types={types}
        isOpen={creating}
        onOpenChange={setCreating}
        onCreated={(token) => {
          setMinted(token)
          void router.invalidate()
        }}
      />
    </>
  )

  return view === 'deployed' ? (
    <RecordList
      title="Canarytokens"
      description="Decoy documents, URLs, and hostnames that phone home the moment an attacker touches them."
      actions={create}
      summary={
        minted && (
          <Banner status="success" title={`Token created: ${minted.memo}`} description={minted.url} isDismissable onDismiss={() => setMinted(null)} endContent={<Link href={`/canarytokens/${encodeURIComponent(minted.id)}`}>Open token</Link>} />
        )
      }
      rows={tokens}
      columns={tokenColumns}
      getId={(row) => row.id}
      getHref={(row) => `/canarytokens/${encodeURIComponent(row.id)}`}
      emptyState={{ title: 'No tokens deployed yet', description: 'Use Create token to plant your first one.' }}
    />
  ) : (
    <RecordList
      title="Canarytokens"
      description="Every planted token that phoned home, wherever it was opened."
      actions={create}
      rows={triggers}
      columns={triggerColumns}
      getId={(row) => row.id}
      getHref={(row) => `/canarytokens/triggers/${encodeURIComponent(row.id)}`}
      emptyState={{ title: 'Nothing has fired', description: 'No planted token has been touched yet.' }}
    />
  )
}
