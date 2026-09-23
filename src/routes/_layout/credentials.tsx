import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Divider } from '@astryxdesign/core/Divider'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Selector } from '@astryxdesign/core/Selector'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { TextArea } from '@astryxdesign/core/TextArea'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { RecordList } from '#/components/RecordList'
import { generatePassword, getCredentials, linkCredentialToken, provisionCredential, rotateCredential } from '#/data/queries'
import type { BaitCredential, CanaryToken } from '#/data/types'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/credentials')({
  loader: () => getCredentials(),
  component: CredentialsPage,
})

function ProvisionPanel({ targets }: { targets: string[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ target: targets[0] ?? '', path: '', username: '', password: generatePassword(), memo: '', template: '' })
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))
  const valid = form.path.trim() && form.username.trim() && form.password

  return (
    <Panel title="Provision a new credential">
      <Text color="secondary">Provisioning writes the file into the honeypot immediately. It is not a draft.</Text>
      <FormLayout direction="horizontal">
        <Selector label="Honeypot" value={form.target} onChange={(target) => set({ target })} options={targets} />
        <TextInput label="Path" isRequired placeholder="home/mwagner/.aws/credentials" value={form.path} onChange={(path) => set({ path })} />
      </FormLayout>
      <FormLayout direction="horizontal">
        <TextInput label="Username" isRequired value={form.username} onChange={(username) => set({ username })} />
        <HStack gap={2} vAlign="end">
          <StackItem size="fill">
            <TextInput label="Password" isRequired value={form.password} onChange={(password) => set({ password })} />
          </StackItem>
          <Button label="Generate" variant="secondary" onClick={() => set({ password: generatePassword() })} />
        </HStack>
      </FormLayout>
      <TextInput label="Memo" isOptional placeholder="Why this bait exists" value={form.memo} onChange={(memo) => set({ memo })} />
      <TextArea
        label="Content template"
        isOptional
        description="Defaults to a two-line username=/password= file. Use {{username}} and {{password}} as placeholders."
        value={form.template}
        onChange={(template) => set({ template })}
      />
      <HStack hAlign="end">
        <Button
          label="Provision"
          isLoading={busy}
          isDisabled={!valid}
          onClick={async () => {
            setBusy(true)
            try {
              await provisionCredential(form)
              setForm({ ...form, path: '', username: '', password: generatePassword(), memo: '', template: '' })
              await router.invalidate()
            } finally {
              setBusy(false)
            }
          }}
        />
      </HStack>
    </Panel>
  )
}

function CredentialInspector({ credential, tokens }: { credential: BaitCredential; tokens: CanaryToken[] }) {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState<'rotate' | 'link' | null>(null)
  const linked = tokens.find((t) => t.id === credential.linkedTokenId)
  const run = async (kind: 'rotate' | 'link', write: () => Promise<unknown>) => {
    setBusy(kind)
    try {
      await write()
      await router.invalidate()
    } finally {
      setBusy(null)
    }
  }
  const rendered = credential.template.replaceAll('{{username}}', credential.username).replaceAll('{{password}}', credential.password)

  return (
    <VStack gap={4}>
      <Text type="code">{credential.path}</Text>
      <MetadataList label={{ position: 'start', width: 96 }}>
        <MetadataListItem label="Honeypot">{credential.target}</MetadataListItem>
        <MetadataListItem label="Username">
          <Text type="code">{credential.username}</Text>
        </MetadataListItem>
        <MetadataListItem label="Password">
          <Text type="code">{credential.password}</Text>
        </MetadataListItem>
        <MetadataListItem label="Memo">{credential.memo || '—'}</MetadataListItem>
        <MetadataListItem label="Created">{`${formatDateTime(credential.createdAt)} by ${credential.createdBy}`}</MetadataListItem>
        {credential.rotatedAt && <MetadataListItem label="Rotated">{`${formatDateTime(credential.rotatedAt)} by ${credential.rotatedBy}`}</MetadataListItem>}
      </MetadataList>
      <VStack gap={2}>
        <Heading level={3}>File as planted</Heading>
        <CodeBlock code={rendered} title={credential.path.split('/').at(-1)} hasCopyButton={false} />
      </VStack>
      <Divider />
      <VStack gap={2}>
        <Heading level={3}>Rotate</Heading>
        <Text type="supporting">Re-implants the file at the same path with a new password.</Text>
        <HStack gap={2} vAlign="end">
          <StackItem size="fill">
            <TextInput label="New password" isLabelHidden placeholder="Blank = auto-generate" value={newPassword} onChange={setNewPassword} />
          </StackItem>
          <Button
            label="Rotate"
            variant="secondary"
            isLoading={busy === 'rotate'}
            onClick={() => run('rotate', async () => {
              await rotateCredential(credential.id, newPassword || undefined)
              setNewPassword('')
            })}
          />
        </HStack>
      </VStack>
      <VStack gap={2}>
        <Heading level={3}>Linked canarytoken</Heading>
        <Selector
          label="Linked canarytoken"
          isLabelHidden
          hasClear
          placeholder="No linked token"
          value={credential.linkedTokenId ?? null}
          onChange={(tokenId) => void run('link', () => linkCredentialToken(credential.id, tokenId ?? undefined))}
          options={tokens.map((t) => ({ value: t.id, label: t.memo, description: t.type }))}
        />
        {linked && <Link href="/canarytokens">Open canarytokens</Link>}
      </VStack>
    </VStack>
  )
}

function CredentialsPage() {
  const { credentials, tokens, targets } = Route.useLoaderData()
  const tokenLabel = (id?: string) => tokens.find((t) => t.id === id)?.memo

  const columns: TableColumn<BaitCredential>[] = [
    { key: 'createdAt', header: 'Created', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.createdAt)}</Text> },
    { key: 'path', header: 'Path', width: proportional(3), renderCell: (row) => <Text type="code">{row.path}</Text> },
    { key: 'username', header: 'Username', width: pixel(168), renderCell: (row) => <Text type="code" maxLines={1}>{row.username}</Text> },
    { key: 'memo', header: 'Memo', width: proportional(2) },
    {
      key: 'linkedTokenId',
      header: 'Linked token',
      width: pixel(128),
      renderCell: (row) => (row.linkedTokenId ? <Token size="sm" color="blue" label="linked" description={tokenLabel(row.linkedTokenId)} /> : <Text type="supporting">—</Text>),
    },
  ]

  return (
    <RecordList
      title="Credentials"
      description="Bait usernames and passwords planted live into honeypot filesystems. Provision, rotate, and optionally link one to a canarytoken."
      actions={<Text type="supporting">{credentials.length} planted</Text>}
      summary={<ProvisionPanel targets={targets} />}
      rows={credentials}
      columns={columns}
      getId={(row) => row.id}
      inspectorTitle="Credential details"
      renderInspector={(row) => <CredentialInspector key={row.id} credential={row} tokens={tokens} />}
      emptyState={{ title: 'No bait credentials yet', description: 'Provision one above to plant it into a honeypot.' }}
    />
  )
}
