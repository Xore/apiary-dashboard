import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { SelectableCard } from '@astryxdesign/core/SelectableCard'
import { Selector } from '@astryxdesign/core/Selector'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useViewTabs } from '#/components/ViewTabs'
import { Panel } from '#/components/DashboardBlocks'
import { RecordList } from '#/components/RecordList'
import { createCanarytoken, getCanarytokens } from '#/data/queries'
import type { CanaryToken, CanaryTokenType, CanaryTrigger } from '#/data/types'
import { downloadJson } from '#/lib/export'
import { formatDateTime, formatTime } from '#/lib/format'

type View = 'deployed' | 'fired'

export const Route = createFileRoute('/_layout/canarytokens')({
  validateSearch: (search: Record<string, unknown>): { view?: View } => ({
    view: search.view === 'fired' ? 'fired' : undefined,
  }),
  loader: () => getCanarytokens(),
  component: CanarytokensPage,
})

const COMMON = ['aws_keys', 'web_bug', 'ms_word', 'kubeconfig']

function MintPanel({ types, preset, onMinted }: { types: CanaryTokenType[]; preset: string; onMinted: (token: CanaryToken) => void }) {
  const router = useRouter()
  const [type, setType] = useState(preset)
  const [memo, setMemo] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = types.find((t) => t.type === type)

  const mint = async () => {
    setBusy(true)
    try {
      const token = await createCanarytoken({ type, memo: memo.trim(), text: text.trim() || undefined })
      setMemo('')
      setText('')
      await router.invalidate()
      onMinted(token)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Mint a new token">
      <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={3}>
        {types
          .filter((t) => COMMON.includes(t.type))
          .map((t) => (
            <SelectableCard key={t.type} label={t.label} isSelected={type === t.type} onChange={() => setType(t.type)}>
              <VStack gap={1}>
                <Text weight="semibold">{t.label}</Text>
                <Text type="supporting">{t.description}</Text>
              </VStack>
            </SelectableCard>
          ))}
      </Grid>
      <HStack gap={2} vAlign="end" wrap="wrap">
        <Selector
          label="Token type"
          value={type}
          onChange={setType}
          options={types.map((t) => ({ value: t.type, label: t.label, description: t.description }))}
        />
        <StackItem size="fill">
          <TextInput label="Memo" isRequired placeholder="Where will this token live?" value={memo} onChange={setMemo} />
        </StackItem>
        {selected?.needs === 'text' && <TextInput label="Text snippet" isOptional value={text} onChange={setText} />}
        <Button label="Mint token" isLoading={busy} isDisabled={!memo.trim()} onClick={mint} />
      </HStack>
      <Text type="supporting">The memo is what the alert shows when the token fires, so say where you planted it.</Text>
    </Panel>
  )
}

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
  { key: 'srcIp', header: 'Source', width: pixel(136), renderCell: (row) => <Link href={`/investigate/ip/${row.srcIp}`}>{row.srcIp}</Link> },
  { key: 'location', header: 'Location', width: pixel(144) },
]

function TokenInspector({ token, triggers }: { token: CanaryToken; triggers: CanaryTrigger[] }) {
  const fired = triggers.filter((t) => t.tokenId === token.id)
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center">
        <Token size="sm" label={token.type} />
        {fired.length > 0 ? <Token size="sm" color="red" label={`fired ${fired.length}×`} /> : <Token size="sm" label="never fired" />}
      </HStack>
      <Text>{token.memo}</Text>
      <MetadataList label={{ position: 'start', width: 96 }}>
        <MetadataListItem label="URL">
          <Text type="code">{token.url}</Text>
        </MetadataListItem>
        <MetadataListItem label="Hostname">
          <Text type="code">{token.hostname}</Text>
        </MetadataListItem>
        <MetadataListItem label="Created">{formatDateTime(token.createdAt)}</MetadataListItem>
        <MetadataListItem label="Created by">{token.createdBy}</MetadataListItem>
        <MetadataListItem label="ID">
          <Text type="code">{token.id}</Text>
        </MetadataListItem>
      </MetadataList>
      <HStack gap={2}>
        <Button label="Copy URL" size="sm" variant="secondary" onClick={() => void navigator.clipboard.writeText(token.url)} />
        {token.artifact && (
          <Button label="Download artifact" size="sm" variant="secondary" onClick={() => downloadJson(`${token.artifact}.json`, { mock: true, token })} />
        )}
      </HStack>
    </VStack>
  )
}

function TriggerInspector({ trigger }: { trigger: CanaryTrigger }) {
  return (
    <VStack gap={4}>
      <Token size="sm" color="red" label={trigger.type} />
      <Text>{trigger.memo}</Text>
      <MetadataList label={{ position: 'start', width: 96 }}>
        <MetadataListItem label="Fired">{formatDateTime(trigger.triggeredAt)}</MetadataListItem>
        <MetadataListItem label="Source">
          <Link href={`/investigate/ip/${trigger.srcIp}`}>{trigger.srcIp}</Link>
        </MetadataListItem>
        <MetadataListItem label="Location">{trigger.location}</MetadataListItem>
        <MetadataListItem label="User agent">
          <Text type="code">{trigger.userAgent}</Text>
        </MetadataListItem>
      </MetadataList>
    </VStack>
  )
}

function CanarytokensPage() {
  const { types, tokens, triggers } = Route.useLoaderData()
  const { view = 'deployed' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [minted, setMinted] = useState<CanaryToken | null>(null)

  useViewTabs({
    label: 'Canarytoken views',
    tabs: [
      { id: 'deployed', label: `Deployed (${tokens.length})` },
      { id: 'fired', label: `Fired (${triggers.length})` },
    ],
    value: view,
    onChange: (value) => void navigate({ search: { view: value === 'fired' ? 'fired' : undefined } }),
  })

  return view === 'deployed' ? (
    <RecordList
      title="Canarytokens"
      description="Decoy documents, URLs, and hostnames that phone home the moment an attacker touches them."
      summary={
        <VStack gap={3}>
          <MintPanel types={types} preset="aws_keys" onMinted={setMinted} />
          {minted && (
            <Panel title="Token minted" action={<Button label="Dismiss" size="sm" variant="ghost" onClick={() => setMinted(null)} />}>
              <Text>{minted.memo}</Text>
              <Text type="code">{minted.url}</Text>
            </Panel>
          )}
        </VStack>
      }
      rows={tokens}
      columns={tokenColumns}
      getId={(row) => row.id}
      inspectorTitle="Token details"
      renderInspector={(row) => <TokenInspector token={row} triggers={triggers} />}
      emptyState={{ title: 'No tokens deployed yet', description: 'Pick a common type above to plant your first one.' }}
    />
  ) : (
    <RecordList
      title="Canarytokens"
      description="Every planted token that phoned home, wherever it was opened."
      rows={triggers}
      columns={triggerColumns}
      getId={(row) => row.id}
      inspectorTitle="Trigger details"
      renderInspector={(row) => <TriggerInspector trigger={row} />}
      emptyState={{ title: 'Nothing has fired', description: 'No planted token has been touched yet.' }}
    />
  )
}
